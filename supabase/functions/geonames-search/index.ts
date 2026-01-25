/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoNamesResult {
  geonameId: number;
  name: string;
  countryName: string;
  countryCode: string;
  lat: string;
  lng: string;
  population: number;
  adminName1?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const username = Deno.env.get('GEONAMES_USERNAME');
    if (!username) {
      console.error('GEONAMES_USERNAME not configured');
      return new Response(
        JSON.stringify({ error: 'GeoNames API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching GeoNames for: "${query}"`);

    // GeoNames search API - much faster than Nominatim
    const url = new URL('http://api.geonames.org/searchJSON');
    url.searchParams.set('q', query);
    url.searchParams.set('maxRows', '8');
    url.searchParams.set('featureClass', 'P'); // Only populated places
    url.searchParams.set('orderby', 'relevance');
    url.searchParams.set('username', username);
    url.searchParams.set('style', 'MEDIUM');

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GeoNames API error:', response.status, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: 'GeoNames API error' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.status) {
      // GeoNames returns status object on error
      console.error('GeoNames error:', data.status.message);
      return new Response(
        JSON.stringify({ error: data.status.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = (data.geonames || []).map((item: GeoNamesResult) => ({
      name: item.name,
      country: item.countryName,
      countryCode: item.countryCode,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lng),
      population: item.population,
      region: item.adminName1 || '',
      displayName: item.adminName1 
        ? `${item.name}, ${item.adminName1}, ${item.countryName}`
        : `${item.name}, ${item.countryName}`,
    }));

    console.log(`Found ${results.length} cities`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geonames-search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
