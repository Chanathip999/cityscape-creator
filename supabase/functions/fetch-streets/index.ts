/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Street types - full detail including pedestrian paths for maximum detail
const ALL_STREET_TYPES = [
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
  { type: 'secondary', tags: ['secondary', 'secondary_link'] },
  { type: 'tertiary', tags: ['tertiary', 'tertiary_link'] },
  { type: 'residential', tags: ['residential', 'living_street', 'unclassified'] },
  { type: 'service', tags: ['service', 'pedestrian'] },
  { type: 'path', tags: ['footway', 'path', 'cycleway', 'track', 'steps', 'bridleway'] },
];

// Simple in-memory cache for recent queries (TTL: 10 minutes for stability)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 600000; // 10 minutes

// All railway types for maximum detail
const RAILWAY_TYPES = ['rail', 'tram', 'subway', 'light_rail', 'monorail', 'narrow_gauge'];

// Aeroway types for airport runways
const AEROWAY_TYPES = ['runway', 'taxiway'];

interface StreetData {
  type: string;
  coordinates: [number, number][][];
}

interface RailwayData {
  type: 'railway';
  coordinates: [number, number][][]; // Array of polylines
}

interface WaterData {
  type: 'water';
  polygons: [number, number][][]; // Array of polygon rings
}

interface ParkData {
  type: 'park';
  polygons: [number, number][][];
}

// Round coordinate to reduce JSON size while maintaining ~1m precision
// 5 decimals = ~1.1m precision (sufficient for smooth curves)
const roundCoord = (n: number): number => Math.round(n * 100000) / 100000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, distance, skipService = false } = await req.json();

    if (!lat || !lng || !distance) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, distance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cache key (rounded to 3 decimals for nearby hits)
    const cacheKey = `${lat.toFixed(3)}-${lng.toFixed(3)}-${distance}-${skipService}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', cacheKey);
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching streets for lat=${lat}, lng=${lng}, distance=${distance}m, skipService=${skipService}`);

    const distanceNum = Number(distance);

    // Keep radius within safe limits - 5km max per tile
    const radius = Math.min(5000, Math.max(2000, distanceNum));

    // Filter street types - skip service roads if requested (they're 60% of data)
    const activeStreetTypes = skipService 
      ? ALL_STREET_TYPES.filter(st => st.type !== 'service')
      : ALL_STREET_TYPES;
    console.log(`Using ${activeStreetTypes.length} street types (skipService: ${skipService})`);

    // Always include all features for maximum detail
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;

    const highwayTags = activeStreetTypes.flatMap(st => st.tags);
    const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
    
    // Build comprehensive query with all features
    // z-order: z=3 roads, z=2.5 railways, z=2 parks/forests, z=1 water, z=0 bg
    const railwayRegex = RAILWAY_TYPES.join('|');
    const aerowayRegex = AEROWAY_TYPES.join('|');
    
    const overpassQuery = `
      [out:json][timeout:45];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
        way["railway"~"^(${railwayRegex})$"](${bbox});
        way["aeroway"~"^(${aerowayRegex})$"](${bbox});
        way["natural"="water"](${bbox});
        way["natural"="coastline"](${bbox});
        way["waterway"~"^(river|stream|canal|drain)$"](${bbox});
        way["leisure"="park"](${bbox});
        way["landuse"~"^(grass|meadow|forest)$"](${bbox});
        way["natural"~"^(wood|beach)$"](${bbox});
      );
      out geom;
    `;

    console.log('Sending Overpass query...');

    const overpassUrls = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    let response: Response | null = null;
    let lastErrorText = '';

    for (const overpassUrl of overpassUrls) {
      try {
        response = await fetch(overpassUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        if (response.ok) break;
        lastErrorText = await response.text();
        console.error('Overpass API error:', overpassUrl, response.status, lastErrorText.substring(0, 200));
      } catch (e) {
        console.error('Overpass fetch failed:', overpassUrl, e);
      }
    }

    if (!response || !response.ok) {
      // Fallback: return last cached data (even if stale) so the preview doesn't look randomly cut.
      if (cached) {
        console.log('Overpass unavailable; serving stale cache for:', cacheKey);
        return new Response(
          JSON.stringify(cached.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'stale' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Overpass API unavailable, try again' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const osmData = await response.json();
    const elements = osmData.elements || [];
    console.log(`Received ${elements.length} elements from Overpass`);

    // Build a fast tag->type lookup to avoid N(types) scans per element
    const tagToType = new Map<string, string>();
    for (const st of activeStreetTypes) {
      for (const tag of st.tags) tagToType.set(tag, st.type);
    }

    // Process streets
    const coordsByType = new Map<string, [number, number][][]>();
    for (const st of activeStreetTypes) coordsByType.set(st.type, []);

    // Process railways (z-order 2.5 in maptoposter)
    const railwayLines: [number, number][][] = [];
    
    // Process aeroways (runways, taxiways)
    const aerowayLines: [number, number][][] = [];

    // Process water, coastlines, and parks/forests
    const waterPolygons: [number, number][][] = [];
    const coastlineLines: [number, number][][] = [];
    const parkPolygons: [number, number][][] = [];
    const forestPolygons: [number, number][][] = [];

    for (const element of elements) {
      if (element.type !== 'way') continue;
      
      const geom = element.geometry;
      if (!geom || geom.length < 2) continue;

      const tags = element.tags || {};

      // Check if it's a highway
      if (tags.highway) {
        const type = tagToType.get(tags.highway);
        if (!type) continue;

        const points: [number, number][] = [];
        for (let i = 0; i < geom.length; i++) {
          const pt = geom[i];
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }

        if (points.length >= 2) {
          coordsByType.get(type)?.push(points);
        }
      }
      // Check if it's a railway (any type - rail, tram, subway, etc.)
      else if (tags.railway && RAILWAY_TYPES.includes(tags.railway)) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          railwayLines.push(points);
        }
      }
      // Check if it's water or waterway
      else if (tags.natural === 'water' || tags.waterway) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          waterPolygons.push(points);
        }
      }
      // Check if it's a coastline
      else if (tags.natural === 'coastline') {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          coastlineLines.push(points);
        }
      }
      // Check if it's an aeroway (runway, taxiway)
      else if (tags.aeroway && AEROWAY_TYPES.includes(tags.aeroway)) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          aerowayLines.push(points);
        }
      }
      // Check if it's a park
      else if (tags.leisure === 'park' || tags.landuse === 'grass' || tags.landuse === 'meadow' || tags.natural === 'beach') {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) {
          parkPolygons.push(points);
        }
      }
      // Check if it's forest/wood
      else if (tags.landuse === 'forest' || tags.natural === 'wood') {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) {
          forestPolygons.push(points);
        }
      }
    }

    const streetData: StreetData[] = activeStreetTypes.map((st) => ({
      type: st.type,
      coordinates: coordsByType.get(st.type) || [],
    }));

    const totalStreets = streetData.reduce((sum, st) => sum + st.coordinates.length, 0);
    console.log(`Returning ${totalStreets} streets, ${railwayLines.length} railways, ${aerowayLines.length} aeroways, ${coastlineLines.length} coastlines, ${waterPolygons.length} water, ${parkPolygons.length} parks, ${forestPolygons.length} forests`);

    const responseData = { 
      streets: streetData,
      railways: railwayLines,
      aeroways: aerowayLines,
      coastlines: coastlineLines,
      water: waterPolygons,
      parks: parkPolygons,
      forests: forestPolygons,
    };
    
    // Cache the result
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    // Clean old cache entries
    for (const [key, value] of cache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-streets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
