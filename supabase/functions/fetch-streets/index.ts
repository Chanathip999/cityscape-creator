/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Street types - only major roads for fast loading
const STREET_TYPES = [
  // include *_link tags to avoid broken-looking discontinuities at junctions/ramps
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
];

// Simple in-memory cache for recent queries (TTL: 60 seconds)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60000;

interface StreetData {
  type: string;
  coordinates: [number, number][][];
}

// Round coordinate to reduce JSON size (~40% smaller)
const roundCoord = (n: number): number => Math.round(n * 10000) / 10000;

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

    // Use distance as radius to cover the full visible map area
    const radius = Math.max(3000, Number(distance));

    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;

    const highwayTags = STREET_TYPES.flatMap(st => st.tags);
    
    // Optimized query: shorter timeout, geometry output instead of full body
    const overpassQuery = `
      [out:json][timeout:15];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)});
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
    console.log(`Received ${elements.length} ways from Overpass`);

    // With "out geom", each way already has geometry inline - no separate node lookup needed
    const streetData: StreetData[] = STREET_TYPES.map(streetType => {
      const coordinates: [number, number][][] = [];

      for (const element of elements) {
        if (element.type !== 'way' || !element.tags?.highway) continue;
        if (!streetType.tags.includes(element.tags.highway)) continue;
        
        const geom = element.geometry;
        if (!geom || geom.length < 2) continue;

        // Simplify: skip every other point if there are many
        const simplified: [number, number][] = [];
        const step = geom.length > 20 ? 2 : 1;
        
        for (let i = 0; i < geom.length; i += step) {
          const pt = geom[i];
          if (pt && pt.lat !== undefined && pt.lon !== undefined) {
            simplified.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
          }
        }
        // Always include last point
        const last = geom[geom.length - 1];
        if (last && simplified.length > 0) {
          const lastSimp = simplified[simplified.length - 1];
          if (lastSimp[0] !== roundCoord(last.lat) || lastSimp[1] !== roundCoord(last.lon)) {
            simplified.push([roundCoord(last.lat), roundCoord(last.lon)]);
          }
        }

        if (simplified.length >= 2) {
          coordinates.push(simplified);
        }
      }

      return { type: streetType.type, coordinates };
    });

    const totalStreets = streetData.reduce((sum, st) => sum + st.coordinates.length, 0);
    console.log(`Returning ${totalStreets} street segments`);

    const responseData = { streets: streetData };
    
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
