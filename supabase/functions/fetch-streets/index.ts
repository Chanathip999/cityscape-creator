const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// PRIORITY-BASED STREET LOADING
// Priority 1 (essential): Motorways, primary roads, water - loads FIRST for fast preview
// Priority 2 (detailed): Secondary, tertiary, residential, parks, forests - loads AFTER
// =============================================================================

// Priority 1: Essential features for fast first paint
const PRIORITY_1_STREET_TYPES = [
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
];

// Priority 2: Detailed features loaded progressively
const PRIORITY_2_STREET_TYPES = [
  { type: 'secondary', tags: ['secondary', 'secondary_link'] },
  { type: 'tertiary', tags: ['tertiary', 'tertiary_link'] },
  { type: 'residential', tags: ['residential', 'living_street', 'unclassified'] },
  { type: 'service', tags: ['service', 'pedestrian'] },
  { type: 'path', tags: ['footway', 'path', 'cycleway', 'track', 'steps', 'bridleway'] },
];

// Combined for backward compatibility
const CORE_STREET_TYPES = [...PRIORITY_1_STREET_TYPES, ...PRIORITY_2_STREET_TYPES.slice(0, 4)];
const ALL_STREET_TYPES = [...PRIORITY_1_STREET_TYPES, ...PRIORITY_2_STREET_TYPES];

// NOTE: In-memory cache removed to prevent BOOT_ERROR/memory issues
// Caching is handled client-side in IndexedDB instead

// All railway types for maximum detail
const RAILWAY_TYPES = ['rail', 'tram', 'subway', 'light_rail', 'monorail', 'narrow_gauge'];

// Aeroway types for airport runways
const AEROWAY_TYPES = ['runway', 'taxiway'];

interface StreetData {
  type: string;
  coordinates: [number, number][][];
}

// Round coordinate to reduce JSON size while maintaining good visual fidelity.
// 5 decimals ~ 1.1m at equator - ensures smooth lines without visible staircase artifacts
const roundCoord = (n: number): number => Math.round(n * 100000) / 100000;

// Thresholds to prevent memory crashes in dense cities (Tokyo, NYC, etc.)
// More generous to allow proper rendering
const ELEMENT_COUNT_THRESHOLD = 40000;
const ELEMENT_COUNT_THRESHOLD_WITH_BUILDINGS = 30000;
// Max elements to process before early termination
const MAX_ELEMENTS_TO_PROCESS = 50000;

// Overpass endpoints (keep list moderate; too many retries/parallel calls increase runtime)
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// Pick a random endpoint to distribute load
function getRandomEndpoint(): string {
  return OVERPASS_URLS[Math.floor(Math.random() * OVERPASS_URLS.length)];
}

// Quick count query with shorter timeout - skip if it fails
async function getElementCount(
  bbox: string,
  highwayTags: string[],
  opts: {
    includeBuildings: boolean;
    includeWater: boolean;
    includeCoastlines: boolean;
    includeParksForests: boolean;
    includeRailways: boolean;
    includeAeroways: boolean;
  }
): Promise<number> {
  const railwayRegex = RAILWAY_TYPES.join('|');
  const aerowayRegex = AEROWAY_TYPES.join('|');

  const {
    includeBuildings,
    includeWater,
    includeCoastlines,
    includeParksForests,
    includeRailways,
    includeAeroways,
  } = opts;

  const buildingQuery = includeBuildings ? `way["building"](${bbox});` : '';

  const waterQuery = includeWater
    ? `
       way["natural"="water"](${bbox});
       way["waterway"~"^(river|stream|canal|drain)$"](${bbox});
      `
    : '';

  const coastlineQuery = includeCoastlines ? `way["natural"="coastline"](${bbox});` : '';

  const parksForestsQuery = includeParksForests
    ? `
       way["leisure"="park"](${bbox});
       way["landuse"~"^(grass|meadow|forest)$"](${bbox});
       way["natural"~"^(wood|beach)$"](${bbox});
      `
    : '';

  const railwaysQuery = includeRailways ? `way["railway"~"^(${railwayRegex})$"](${bbox});` : '';
  const aerowaysQuery = includeAeroways ? `way["aeroway"~"^(${aerowayRegex})$"](${bbox});` : '';
  
  const countQuery = `
    [out:json][timeout:5];
    (
      way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
      ${railwaysQuery}
      ${aerowaysQuery}
      ${waterQuery}
      ${coastlineQuery}
      ${parksForestsQuery}
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

// Buildings-only count query (fast + small response) to avoid memory crashes in dense areas
async function getBuildingCount(bbox: string): Promise<number> {
  const countQuery = `
    [out:json][timeout:5];
    way["building"](${bbox});
    out count;
  `;

  const endpoints = [...OVERPASS_URLS].sort(() => Math.random() - 0.5);
  for (const url of endpoints.slice(0, 2)) {
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

      await response.text();
    } catch {
      // ignore and try next
    }
  }

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

  // OPTIMIZATION: Buildings-only query with VERY short timeout and limit
  if (buildingsOnly) {
    return `
      [out:json][timeout:8][maxsize:10485760];
      way["building"](${bbox});
      out geom;
    `;
  }

  // Building query - only when requested
  const buildingQuery = includeBuildings ? `way["building"](${bbox});` : '';

  if (!includePolygons) {
    // Reduced mode: only linear features - short timeout
    return `
      [out:json][timeout:10][maxsize:15728640];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
        way["railway"~"^(${railwayRegex})$"](${bbox});
        way["aeroway"~"^(${aerowayRegex})$"](${bbox});
        ${buildingQuery}
      );
      out geom;
    `;
  }

  // Full mode - conservative timeout and memory limit
  return `
    [out:json][timeout:12][maxsize:20971520];
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

// Priority-aware query builder for progressive loading
function buildPriorityQuery(params: {
  bbox: string;
  highwayTags: string[];
  includePolygons: boolean;
  includeBuildings: boolean;
  includeWater: boolean;
  includeCoastlines: boolean;
  includeParksForests: boolean;
  includeRailways: boolean;
  includeAeroways: boolean;
}): string {
  const { 
    bbox, 
    highwayTags, 
    includePolygons, 
    includeBuildings,
    includeWater,
    includeCoastlines,
    includeParksForests,
    includeRailways,
    includeAeroways,
  } = params;
  
  const railwayRegex = RAILWAY_TYPES.join('|');
  const aerowayRegex = AEROWAY_TYPES.join('|');

  const queryParts: string[] = [];
  
  // Always include highways
  if (highwayTags.length > 0) {
    queryParts.push(`way["highway"~"^(${highwayTags.join('|')})$"](${bbox});`);
  }
  
  // Conditionally include other features
  if (includeRailways) {
    queryParts.push(`way["railway"~"^(${railwayRegex})$"](${bbox});`);
  }
  if (includeAeroways) {
    queryParts.push(`way["aeroway"~"^(${aerowayRegex})$"](${bbox});`);
  }
  if (includeWater) {
    queryParts.push(`way["natural"="water"](${bbox});`);
    queryParts.push(`way["waterway"~"^(river|stream|canal|drain)$"](${bbox});`);
  }
  if (includeCoastlines) {
    queryParts.push(`way["natural"="coastline"](${bbox});`);
  }
  if (includeParksForests && includePolygons) {
    queryParts.push(`way["leisure"="park"](${bbox});`);
    queryParts.push(`way["landuse"~"^(grass|meadow|forest)$"](${bbox});`);
    queryParts.push(`way["natural"~"^(wood|beach)$"](${bbox});`);
  }
  if (includeBuildings) {
    queryParts.push(`way["building"](${bbox});`);
  }

  // Priority queries get shorter timeouts for speed
  const timeout = queryParts.length <= 4 ? 10 : 18;

  return `
    [out:json][timeout:${timeout}];
    (
      ${queryParts.join('\n      ')}
    );
    out geom;
  `;
}

async function fetchOverpass(query: string): Promise<any[] | null> {
  // Sequential retry: parallel hedging increased compute usage and triggered WORKER_LIMIT.
  const endpoints = [...OVERPASS_URLS].sort(() => Math.random() - 0.5);
  const timeoutMs = 11000;
  const body = `data=${encodeURIComponent(query)}`;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const elements = data?.elements || [];
        if (elements.length > MAX_ELEMENTS_TO_PROCESS) {
          console.log(`Truncating ${elements.length} elements to ${MAX_ELEMENTS_TO_PROCESS}`);
          return elements.slice(0, MAX_ELEMENTS_TO_PROCESS);
        }
        return elements;
      }

      if (response.status === 429 || response.status >= 500) {
        console.log(`Error ${response.status} on ${url}, trying next...`);
        await response.text();
        continue;
      }

      const errorText = await response.text();
      console.error('Overpass error:', url, response.status, errorText.substring(0, 80));
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.log(`Timeout on ${url}, trying next...`);
        continue;
      }
      console.error('Overpass fetch failed:', url);
    }
  }

  return []; // empty instead of null to prevent black gaps
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      lat,
      lng,
      distance,
      skipService = false,
      includeBuildings = false,
      buildingsOnly = false,
      priority = 0, // 0 = all, 1 = essential only, 2 = details only
      layerVisibility,
    } = await req.json();

    if (!lat || !lng || !distance) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, distance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NOTE: Server-side cache removed to prevent BOOT_ERROR/memory issues
    // Caching is handled client-side in IndexedDB instead

    console.log(
      `Fetching streets for lat=${lat}, lng=${lng}, distance=${distance}m, priority=${priority}, skipService=${skipService}, buildings=${includeBuildings}, buildingsOnly=${buildingsOnly}`
    );

    const distanceNum = Number(distance);
    // IMPORTANT: Keep bbox small enough to avoid memory/timeouts in dense cities.
    // Client tiling provides coverage; server must stay within compute limits.
    const radius = Math.min(4000, Math.max(1000, distanceNum));

    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;
    const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;

    // FAST PATH: buildings-only mode to avoid large mixed payloads & memory spikes
    if (buildingsOnly) {
      // Density guard: skip buildings only in EXTREMELY dense areas
      const buildingCount = await getBuildingCount(bbox);
      // Higher threshold (25000) to allow more buildings - we'll stream/cap if needed
      if (buildingCount > 25000) {
        console.log(`Buildings-only: SKIP (too dense: ${buildingCount} buildings in bbox)`);
        const responseData = {
          streets: [],
          railways: [],
          aeroways: [],
          coastlines: [],
          water: [],
          parks: [],
          forests: [],
          buildings: [],
        };

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const query = buildQuery({
        bbox,
        highwayTags: [],
        includePolygons: false,
        includeBuildings: true,
        buildingsOnly: true,
      });

      const elements = await fetchOverpass(query);

      if (elements === null) {
        return new Response(JSON.stringify({ error: 'Overpass API unavailable' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const buildingPolygons: [number, number][][] = [];
      // Higher cap to allow more detailed building data
      const MAX_BUILDING_POLYGONS = 15000;
      for (const element of elements) {
        if (buildingPolygons.length >= MAX_BUILDING_POLYGONS) break;
        if (element.type !== 'way') continue;
        const geom = element.geometry;
        if (!geom || geom.length < 3) continue;
        const tags = element.tags || {};
        if (!tags.building) continue;

        const points: [number, number][] = [];
        for (const pt of geom) {
          if (pt?.lat !== undefined && pt?.lon !== undefined) {
            points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        if (points.length >= 3) buildingPolygons.push(points);
      }

      const responseData = {
        streets: [],
        railways: [],
        aeroways: [],
        coastlines: [],
        water: [],
        parks: [],
        forests: [],
        buildings: buildingPolygons,
      };

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==========================================================================
    // PRIORITY-BASED LOADING
    // Priority 1: Only essential (motorway, primary, water, coastlines) - FAST
    // Priority 2: Only details (secondary, tertiary, residential, parks, forests)
    // Priority 0: Everything (backward compatible)
    // ==========================================================================
    
    let activeStreetTypes;

    // Respect frontend visibility toggles to reduce payload & avoid reduced mode,
    // while keeping full street detail.
    const lv = layerVisibility as
      | {
          water?: boolean;
          forests?: boolean;
          parks?: boolean;
          railways?: boolean;
          aeroways?: boolean;
          coastlines?: boolean;
          buildings?: boolean;
        }
      | undefined;

    let includeWater = lv?.water ?? true;
    let includeCoastlines = lv?.coastlines ?? true;
    let includeParksForests = (lv?.parks ?? true) || (lv?.forests ?? true);
    let includeRailways = lv?.railways ?? true;
    let includeAeroways = lv?.aeroways ?? true;
    
    if (priority === 1) {
      // FAST PATH: Only essential features for immediate visual feedback
      activeStreetTypes = PRIORITY_1_STREET_TYPES;
      includeParksForests = false; // Skip for speed
      includeRailways = false;
      includeAeroways = false;
      console.log('PRIORITY 1: Essential features only (fast path)');
    } else if (priority === 2) {
      // DETAIL PATH: Load remaining features
      activeStreetTypes = PRIORITY_2_STREET_TYPES;
      includeWater = false; // Already loaded in priority 1
      includeCoastlines = false;
      console.log('PRIORITY 2: Detail features only');
    } else {
      // FULL PATH: Everything (backward compatible)
      activeStreetTypes = skipService ? CORE_STREET_TYPES : ALL_STREET_TYPES;
    }
    
    const highwayTags = activeStreetTypes.flatMap(st => st.tags);

    // CRITICAL FIX: Check element count BEFORE fetching full data to avoid memory crashes
    // Skip count check for priority requests (they're already filtered)
    let estimatedCount = 0;
    let useReducedMode = false;
    let includePolygons = true;
    
    if (priority === 0) {
      console.log('Checking element count...');
      estimatedCount = await getElementCount(bbox, highwayTags, {
        includeBuildings: false,
        includeWater,
        includeCoastlines,
        includeParksForests,
        includeRailways,
        includeAeroways,
      });
      console.log(`Estimated element count (without buildings): ${estimatedCount}`);
      
      const threshold = includeBuildings ? ELEMENT_COUNT_THRESHOLD_WITH_BUILDINGS : ELEMENT_COUNT_THRESHOLD;
      useReducedMode = estimatedCount > threshold;
      includePolygons = !useReducedMode;
    }
    
    // Allow buildings in moderately dense areas
    // Higher threshold to enable building data for most cities
    const actuallyIncludeBuildings = includeBuildings && estimatedCount < 25000;

    // For reduced mode, also use core streets only (no service/paths)
    const finalHighwayTags = useReducedMode 
      ? CORE_STREET_TYPES.flatMap(st => st.tags)
      : highwayTags;

    if (useReducedMode) {
      console.log(`Using REDUCED mode (${estimatedCount} elements > threshold)`);
    } else if (priority === 0) {
      console.log(`Using FULL mode (${estimatedCount} elements)`);
    }
    
    if (includeBuildings) {
      console.log(`Buildings: ${actuallyIncludeBuildings ? 'ENABLED' : 'SKIPPED (too dense)'}`);
    }

    // Build priority-aware query
    const query = buildPriorityQuery({
      bbox,
      highwayTags: finalHighwayTags,
      includePolygons: priority === 0 ? includePolygons : (priority === 2),
      includeBuildings: actuallyIncludeBuildings,
      includeWater,
      includeCoastlines,
      includeParksForests,
      includeRailways,
      includeAeroways,
    });
    const elements = await fetchOverpass(query);

    if (elements === null) {
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
    
    // NOTE: No server-side caching - handled by client IndexedDB

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
