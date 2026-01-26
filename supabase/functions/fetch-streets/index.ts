/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Street types - core roads only to reduce memory usage
// footway/path/cycleway removed as they cause memory overflow in dense cities
const ALL_STREET_TYPES = [
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
  { type: 'secondary', tags: ['secondary', 'secondary_link'] },
  { type: 'tertiary', tags: ['tertiary', 'tertiary_link'] },
  { type: 'residential', tags: ['residential', 'living_street', 'unclassified'] },
  { type: 'service', tags: ['service', 'pedestrian'] }, // Removed footway, path, cycleway, track, steps
];

// Simple in-memory cache for recent queries (TTL: 60 seconds)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60000;

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
    const { lat, lng, distance } = await req.json();

    if (!lat || !lng || !distance) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, distance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cache key (rounded to 3 decimals for nearby hits)
    const cacheKey = `${lat.toFixed(3)}-${lng.toFixed(3)}-${distance}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', cacheKey);
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching streets for lat=${lat}, lng=${lng}, distance=${distance}m`);

    const distanceNum = Number(distance);

    // Keep radius within safe limits - reduced to 3km to prevent memory crashes
    const radius = Math.min(3000, Math.max(1500, distanceNum));

    // Use all street types (footway/path already removed from definition)
    const activeStreetTypes = ALL_STREET_TYPES;
    console.log(`Using street types for ${radius}m radius`);

    // Disable water/parks entirely - they cause too much memory usage
    // Can be re-enabled later with a dedicated endpoint or smaller radius
    const includeWaterParks = false;

    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;

    const highwayTags = activeStreetTypes.flatMap(st => st.tags);
    const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
    
    // Build query conditionally - include water/parks/railways for smaller radii
    // z-order from maptoposter: z=3 roads, z=2.5 railways, z=2 parks, z=1 water, z=0 bg
    let overpassQuery: string;
    
    if (includeWaterParks) {
      overpassQuery = `
        [out:json][timeout:30];
        (
          way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
          way["railway"="rail"](${bbox});
          way["natural"="water"](${bbox});
          way["waterway"~"^(river|canal|riverbank)$"](${bbox});
          way["leisure"="park"](${bbox});
          way["landuse"~"^(grass|meadow)$"](${bbox});
        );
        out geom;
      `;
    } else {
      // Large areas: streets and railways only
      overpassQuery = `
        [out:json][timeout:20];
        (
          way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
          way["railway"="rail"](${bbox});
        );
        out geom;
      `;
    }

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

    // Process water and parks
    const waterPolygons: [number, number][][] = [];
    const parkPolygons: [number, number][][] = [];

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
      // Check if it's a railway (z-order 2.5)
      else if (tags.railway === 'rail') {
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
      // Check if it's water
      else if (tags.natural === 'water' || tags.waterway) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) {
          waterPolygons.push(points);
        }
      }
      // Check if it's a park
      else if (tags.leisure === 'park' || tags.landuse === 'grass' || tags.landuse === 'meadow') {
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
    }

    const streetData: StreetData[] = activeStreetTypes.map((st) => ({
      type: st.type,
      coordinates: coordsByType.get(st.type) || [],
    }));

    const totalStreets = streetData.reduce((sum, st) => sum + st.coordinates.length, 0);
    console.log(`Returning ${totalStreets} street segments, ${railwayLines.length} railways, ${waterPolygons.length} water, ${parkPolygons.length} parks`);

    const responseData = { 
      streets: streetData,
      railways: railwayLines,
      water: waterPolygons,
      parks: parkPolygons,
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
