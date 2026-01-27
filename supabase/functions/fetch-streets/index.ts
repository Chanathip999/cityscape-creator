/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Street types - all types for maximum detail like reference
const CORE_STREET_TYPES = [
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
  { type: 'secondary', tags: ['secondary', 'secondary_link'] },
  { type: 'tertiary', tags: ['tertiary', 'tertiary_link'] },
  { type: 'residential', tags: ['residential', 'living_street', 'unclassified'] },
  { type: 'service', tags: ['service', 'pedestrian'] },
];

// Additional fine-detail street types
const EXTRA_STREET_TYPES = [
  { type: 'path', tags: ['footway', 'path', 'cycleway', 'track', 'steps', 'bridleway'] },
];

const ALL_STREET_TYPES = [...CORE_STREET_TYPES, ...EXTRA_STREET_TYPES];

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

// Round coordinate to reduce JSON size while maintaining ~1m precision
const roundCoord = (n: number): number => Math.round(n * 100000) / 100000;

// Threshold: if count query returns more than this, use reduced mode
// Threshold for reduced mode - much lower when buildings requested
const ELEMENT_COUNT_THRESHOLD = 40000;
const ELEMENT_COUNT_THRESHOLD_WITH_BUILDINGS = 20000; // Lower threshold for buildings

// More Overpass endpoints for better load distribution and reliability
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// Pick a random endpoint to distribute load
function getRandomEndpoint(): string {
  return OVERPASS_URLS[Math.floor(Math.random() * OVERPASS_URLS.length)];
}

// Quick count query with shorter timeout - skip if it fails
async function getElementCount(bbox: string, highwayTags: string[], includeBuildings: boolean): Promise<number> {
  const railwayRegex = RAILWAY_TYPES.join('|');
  const aerowayRegex = AEROWAY_TYPES.join('|');
  
  let buildingQuery = '';
  if (includeBuildings) {
    buildingQuery = `way["building"](${bbox});`;
  }
  
  const countQuery = `
    [out:json][timeout:5];
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
      ${buildingQuery}
    );
    out count;
  `;

  // Try random endpoint first to distribute load
  const endpoints = [...OVERPASS_URLS].sort(() => Math.random() - 0.5);
  
  for (const url of endpoints.slice(0, 2)) { // Only try 2 endpoints for count
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(countQuery)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const count = data?.elements?.[0]?.tags?.total || data?.elements?.[0]?.tags?.ways || 0;
        return parseInt(count, 10) || 0;
      }
      await response.text(); // Consume body
    } catch (e) {
      // Silent fail - we'll use default
    }
  }

  // Skip count check and fetch directly with full mode
  return 0;
}

function buildQuery(params: {
  bbox: string;
  highwayTags: string[];
  includePolygons: boolean;
  includeBuildings: boolean;
  buildingsOnly?: boolean;
}): string {
  const { bbox, highwayTags, includePolygons, includeBuildings, buildingsOnly } = params;
  const railwayRegex = RAILWAY_TYPES.join('|');
  const aerowayRegex = AEROWAY_TYPES.join('|');

  // OPTIMIZATION: Buildings-only query for parallel fetching
  if (buildingsOnly) {
    return `
      [out:json][timeout:12];
      way["building"](${bbox});
      out geom;
    `;
  }

  // Building query - only when requested
  const buildingQuery = includeBuildings ? `way["building"](${bbox});` : '';

  if (!includePolygons) {
    // Reduced mode: only linear features (roads, railways, aeroways) - shorter timeout
    return `
      [out:json][timeout:15];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
        way["railway"~"^(${railwayRegex})$"](${bbox});
        way["aeroway"~"^(${aerowayRegex})$"](${bbox});
        ${buildingQuery}
      );
      out geom;
    `;
  }

  // Full mode with all features - shorter timeout for speed
  return `
    [out:json][timeout:18];
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
      ${buildingQuery}
    );
    out geom;
  `;
}

async function fetchOverpass(query: string): Promise<any[] | null> {
  // Shuffle endpoints to distribute load
  const endpoints = [...OVERPASS_URLS].sort(() => Math.random() - 0.5);
  
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data?.elements || [];
      }

      // Rate limited - try next endpoint
      if (response.status === 429) {
        console.log(`Rate limited on ${url}, trying next...`);
        await response.text(); // Consume body
        continue;
      }

      const errorText = await response.text();
      console.error('Overpass error:', url, response.status, errorText.substring(0, 100));
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.log(`Timeout on ${url}, trying next...`);
        continue;
      }
      console.error('Overpass fetch failed:', url);
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, distance, skipService = false, includeBuildings = false } = await req.json();

    if (!lat || !lng || !distance) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, distance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cache key (include buildings flag)
    const cacheKey = `${lat.toFixed(3)}-${lng.toFixed(3)}-${distance}-${skipService}-${includeBuildings}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', cacheKey);
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching streets for lat=${lat}, lng=${lng}, distance=${distance}m, skipService=${skipService}, buildings=${includeBuildings}`);

    const distanceNum = Number(distance);
    const radius = Math.min(5000, Math.max(2000, distanceNum));

    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;
    const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;

    // Determine which street types to use
    const activeStreetTypes = skipService 
      ? CORE_STREET_TYPES 
      : ALL_STREET_TYPES;
    const highwayTags = activeStreetTypes.flatMap(st => st.tags);

    // CRITICAL FIX: Check element count BEFORE fetching full data to avoid memory crashes
    console.log('Checking element count...');
    // Don't include buildings in count query - check separately
    const estimatedCount = await getElementCount(bbox, highwayTags, false);
    console.log(`Estimated element count (without buildings): ${estimatedCount}`);

    // Use stricter threshold when buildings are requested
    const threshold = includeBuildings ? ELEMENT_COUNT_THRESHOLD_WITH_BUILDINGS : ELEMENT_COUNT_THRESHOLD;
    let useReducedMode = estimatedCount > threshold;
    let includePolygons = !useReducedMode;
    
    // CRITICAL: Skip buildings entirely in reduced mode or very dense areas
    const actuallyIncludeBuildings = includeBuildings && estimatedCount < ELEMENT_COUNT_THRESHOLD_WITH_BUILDINGS;

    // For reduced mode, also use core streets only (no service/paths)
    const finalHighwayTags = useReducedMode 
      ? CORE_STREET_TYPES.flatMap(st => st.tags)
      : highwayTags;

    if (useReducedMode) {
      console.log(`Using REDUCED mode for dense area (${estimatedCount} elements, threshold: ${threshold})`);
    } else {
      console.log(`Using FULL mode (${estimatedCount} elements, threshold: ${threshold})`);
    }
    
    if (includeBuildings && !actuallyIncludeBuildings) {
      console.log('Buildings skipped due to density - area too complex');
    }

    const query = buildQuery({ bbox, highwayTags: finalHighwayTags, includePolygons, includeBuildings: actuallyIncludeBuildings });
    const elements = await fetchOverpass(query);

    if (elements === null) {
      // Fallback to stale cache
      if (cached) {
        console.log('Overpass unavailable; serving stale cache');
        return new Response(
          JSON.stringify(cached.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'stale' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Overpass API unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received ${elements.length} elements from Overpass`);

    // Build tag->type lookup
    const tagToType = new Map<string, string>();
    for (const st of activeStreetTypes) {
      for (const tag of st.tags) tagToType.set(tag, st.type);
    }

    // Process streets
    const coordsByType = new Map<string, [number, number][][]>();
    for (const st of activeStreetTypes) coordsByType.set(st.type, []);

    const railwayLines: [number, number][][] = [];
    const aerowayLines: [number, number][][] = [];
    const waterPolygons: [number, number][][] = [];
    const coastlineLines: [number, number][][] = [];
    const parkPolygons: [number, number][][] = [];
    const forestPolygons: [number, number][][] = [];
    const buildingPolygons: [number, number][][] = [];

    for (const element of elements) {
      if (element.type !== 'way') continue;
      
      const geom = element.geometry;
      if (!geom || geom.length < 2) continue;

      const tags = element.tags || {};

      if (tags.highway) {
        const type = tagToType.get(tags.highway);
        if (!type) continue;

        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }

        if (points.length >= 2) {
          coordsByType.get(type)?.push(points);
        }
      }
      else if (tags.railway && RAILWAY_TYPES.includes(tags.railway)) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          railwayLines.push(points);
        }
      }
      else if (tags.natural === 'water' || tags.waterway) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          waterPolygons.push(points);
        }
      }
      else if (tags.natural === 'coastline') {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          coastlineLines.push(points);
        }
      }
      else if (tags.aeroway && AEROWAY_TYPES.includes(tags.aeroway)) {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 2) {
          aerowayLines.push(points);
        }
      }
      else if (tags.leisure === 'park' || tags.landuse === 'grass' || tags.landuse === 'meadow' || tags.natural === 'beach') {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) {
          parkPolygons.push(points);
        }
      }
      else if (tags.landuse === 'forest' || tags.natural === 'wood') {
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) {
          forestPolygons.push(points);
        }
      }
      else if (tags.building) {
        // Building outlines - requires closed polygon
        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) {
          buildingPolygons.push(points);
        }
      }
    }

    const streetData: StreetData[] = activeStreetTypes.map((st) => ({
      type: st.type,
      coordinates: coordsByType.get(st.type) || [],
    }));

    const totalStreets = streetData.reduce((sum, st) => sum + st.coordinates.length, 0);
    console.log(`Returning ${totalStreets} streets, ${railwayLines.length} railways, ${aerowayLines.length} aeroways, ${coastlineLines.length} coastlines, ${waterPolygons.length} water, ${parkPolygons.length} parks, ${forestPolygons.length} forests, ${buildingPolygons.length} buildings`);

    const responseData = { 
      streets: streetData,
      railways: railwayLines,
      aeroways: aerowayLines,
      coastlines: coastlineLines,
      water: waterPolygons,
      parks: parkPolygons,
      forests: forestPolygons,
      buildings: buildingPolygons,
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
