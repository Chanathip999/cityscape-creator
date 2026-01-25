/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Street types - reduced to main roads only for faster loading and cleaner look
// Excluded: tertiary, residential, living_street, unclassified, road
const STREET_TYPES = [
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
  { type: 'secondary', tags: ['secondary', 'secondary_link'] },
];

interface StreetData {
  type: string;
  coordinates: [number, number][][]; // Array of polylines, each polyline is array of [lat, lng]
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    console.log(`Fetching streets for lat=${lat}, lng=${lng}, distance=${distance}m`);

    // Calculate bounding box from center and distance
    const latDelta = (distance / 111320); // degrees latitude per meter
    const lngDelta = (distance / (111320 * Math.cos(lat * Math.PI / 180))); // degrees longitude per meter
    
    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;

    // Build Overpass query for all street types
    const highwayTags = STREET_TYPES.flatMap(st => st.tags);
    const highwayFilter = highwayTags.map(tag => `["highway"="${tag}"]`).join('');
    
    const overpassQuery = `
      [out:json][timeout:30];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${south},${west},${north},${east});
      );
      out body;
      >;
      out skel qt;
    `;

    console.log('Sending Overpass query...');

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch street data from Overpass API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const osmData = await response.json();
    console.log(`Received ${osmData.elements?.length || 0} elements from Overpass`);

    // Parse OSM data: build node lookup and extract ways
    const nodes: Record<number, [number, number]> = {};
    const ways: Array<{ id: number; highway: string; nodes: number[] }> = [];

    for (const element of osmData.elements || []) {
      if (element.type === 'node') {
        nodes[element.id] = [element.lat, element.lon];
      } else if (element.type === 'way' && element.tags?.highway) {
        ways.push({
          id: element.id,
          highway: element.tags.highway,
          nodes: element.nodes,
        });
      }
    }

    console.log(`Parsed ${Object.keys(nodes).length} nodes and ${ways.length} ways`);

    // Group ways by street type
    const streetData: StreetData[] = STREET_TYPES.map(streetType => {
      const coordinates: [number, number][][] = [];

      for (const way of ways) {
        if (streetType.tags.includes(way.highway)) {
          const polyline: [number, number][] = [];
          for (const nodeId of way.nodes) {
            const coord = nodes[nodeId];
            if (coord) {
              polyline.push(coord);
            }
          }
          if (polyline.length >= 2) {
            coordinates.push(polyline);
          }
        }
      }

      return {
        type: streetType.type,
        coordinates,
      };
    });

    const totalStreets = streetData.reduce((sum, st) => sum + st.coordinates.length, 0);
    console.log(`Returning ${totalStreets} street segments`);

    return new Response(
      JSON.stringify({ streets: streetData }),
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
