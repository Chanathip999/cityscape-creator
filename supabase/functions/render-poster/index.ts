/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RenderRequest {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  distance: number;
  aspectRatio: string;
  theme: {
    id: string;
    bg: string;
    text: string;
    water: string;
    parks: string;
    roadMotorway: string;
    roadPrimary: string;
    roadSecondary: string;
    roadTertiary: string;
    roadResidential: string;
    roadService: string;
  };
  fontFamily: string;
  fontSize: string;
  customTextColor?: string;
  width?: number;  // Output width in pixels (default 1920)
  height?: number; // Output height in pixels (auto-calculated from aspect ratio if not provided)
}

interface StreetSegment {
  type: string;
  coordinates: [number, number][][];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants (ported from Python script)
// ─────────────────────────────────────────────────────────────────────────────

const STREET_WIDTHS: Record<string, number> = {
  motorway: 1.2,
  motorway_link: 1.0,
  trunk: 1.0,
  trunk_link: 0.9,
  primary: 1.0,
  primary_link: 0.9,
  secondary: 0.8,
  secondary_link: 0.7,
  tertiary: 0.6,
  tertiary_link: 0.5,
  residential: 0.4,
  living_street: 0.4,
  unclassified: 0.4,
  service: 0.3,
};

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1, height: 1 },
  '2:3': { width: 2, height: 3 },
  '3:2': { width: 3, height: 2 },
  '3:4': { width: 3, height: 4 },
  '4:3': { width: 4, height: 3 },
  '4:5': { width: 4, height: 5 },
  '5:4': { width: 5, height: 4 },
  '9:16': { width: 9, height: 16 },
  '16:9': { width: 16, height: 9 },
  '6:19': { width: 6, height: 19 },
  '19:6': { width: 19, height: 6 },
};

// Typography settings (matching posterTypography.ts)
const TRACKING = {
  title: 0.3,
  subtitle: 0.15,
  coords: 0.05,
};

const TEXT_POSITIONS = {
  title: 0.84,
  subtitle: 0.88,
  coords: 0.91,
};

const FONT_WEIGHTS = {
  title: 700,
  subtitle: 300,
  coords: 400,
};

const BASE_FONT_SIZES = {
  title: 72,
  subtitle: 28,
  coords: 18,
  attribution: 10,
};

const FONT_SIZE_MULTIPLIERS: Record<string, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
};

// ─────────────────────────────────────────────────────────────────────────────
// Street Types for Overpass Query
// ─────────────────────────────────────────────────────────────────────────────

const ALL_STREET_TYPES = [
  { type: 'motorway', tags: ['motorway', 'motorway_link'] },
  { type: 'primary', tags: ['trunk', 'trunk_link', 'primary', 'primary_link'] },
  { type: 'secondary', tags: ['secondary', 'secondary_link'] },
  { type: 'tertiary', tags: ['tertiary', 'tertiary_link'] },
  { type: 'residential', tags: ['residential', 'living_street', 'unclassified'] },
  { type: 'service', tags: ['service'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

const roundCoord = (n: number): number => Math.round(n * 100000) / 100000;

function formatCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lonStr}`;
}

function getCropLimits(lat: number, lng: number, distance: number, aspectValue: number) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);

  let halfX = distance / metersPerDegreeLng;
  let halfY = distance / metersPerDegreeLat;

  if (aspectValue > 1) {
    halfY = halfX / aspectValue;
  } else if (aspectValue < 1) {
    halfX = halfY * aspectValue;
  }

  return {
    minLng: lng - halfX,
    maxLng: lng + halfX,
    minLat: lat - halfY,
    maxLat: lat + halfY,
  };
}

function toCanvasCoords(
  lat: number,
  lng: number,
  width: number,
  height: number,
  bounds: ReturnType<typeof getCropLimits>
) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
  const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
  return { x, y };
}

function getStreetColor(type: string, theme: RenderRequest['theme']): string {
  if (['motorway', 'motorway_link'].includes(type)) return theme.roadMotorway;
  if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(type)) return theme.roadPrimary;
  if (['secondary', 'secondary_link'].includes(type)) return theme.roadSecondary;
  if (['tertiary', 'tertiary_link'].includes(type)) return theme.roadTertiary;
  if (['residential', 'living_street', 'unclassified'].includes(type)) return theme.roadResidential;
  return theme.roadService || theme.roadResidential;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overpass Data Fetching
// ─────────────────────────────────────────────────────────────────────────────

async function fetchStreetData(lat: number, lng: number, distance: number): Promise<{
  streets: StreetSegment[];
  water: [number, number][][];
  parks: [number, number][][];
}> {
  const radius = Math.min(12000, Math.max(2500, distance));
  const includeWaterParks = distance <= 10000;
  
  const activeStreetTypes = distance > 12000
    ? ALL_STREET_TYPES.slice(0, 4)
    : distance > 8000
      ? ALL_STREET_TYPES.slice(0, 5)
      : ALL_STREET_TYPES;

  const latDelta = radius / 111320;
  const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
  
  const south = lat - latDelta;
  const north = lat + latDelta;
  const west = lng - lngDelta;
  const east = lng + lngDelta;

  const highwayTags = activeStreetTypes.flatMap(st => st.tags);
  const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
  
  let overpassQuery: string;
  
  if (includeWaterParks) {
    overpassQuery = `
      [out:json][timeout:25];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
        way["natural"="water"](${bbox});
        way["waterway"~"^(river|canal|riverbank)$"](${bbox});
        way["leisure"="park"](${bbox});
        way["landuse"~"^(grass|meadow)$"](${bbox});
      );
      out geom;
    `;
  } else {
    overpassQuery = `
      [out:json][timeout:20];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
      );
      out geom;
    `;
  }

  const overpassUrls = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  let response: Response | null = null;

  for (const overpassUrl of overpassUrls) {
    try {
      response = await fetch(overpassUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });
      if (response.ok) break;
    } catch (e) {
      console.error('Overpass fetch failed:', overpassUrl, e);
    }
  }

  if (!response || !response.ok) {
    throw new Error('Overpass API unavailable');
  }

  const osmData = await response.json();
  const elements = osmData.elements || [];

  const tagToType = new Map<string, string>();
  for (const st of activeStreetTypes) {
    for (const tag of st.tags) tagToType.set(tag, st.type);
  }

  const coordsByType = new Map<string, [number, number][][]>();
  for (const st of activeStreetTypes) coordsByType.set(st.type, []);

  const waterPolygons: [number, number][][] = [];
  const parkPolygons: [number, number][][] = [];

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
        if (pt && pt.lat !== undefined && pt.lon !== undefined) {
          points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
        }
      }
      if (points.length >= 2) {
        coordsByType.get(type)?.push(points);
      }
    } else if (tags.natural === 'water' || tags.waterway) {
      const points: [number, number][] = [];
      for (const pt of geom) {
        if (pt && pt.lat !== undefined && pt.lon !== undefined) {
          points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
        }
      }
      if (points.length >= 3) {
        waterPolygons.push(points);
      }
    } else if (tags.leisure === 'park' || tags.landuse === 'grass' || tags.landuse === 'meadow') {
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

  const streets: StreetSegment[] = activeStreetTypes.map((st) => ({
    type: st.type,
    coordinates: coordsByType.get(st.type) || [],
  }));

  return { streets, water: waterPolygons, parks: parkPolygons };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Generation (since we can't use Canvas in Deno easily)
// ─────────────────────────────────────────────────────────────────────────────

function generateSVG(request: RenderRequest, data: {
  streets: StreetSegment[];
  water: [number, number][][];
  parks: [number, number][][];
}): string {
  const aspectConfig = ASPECT_RATIOS[request.aspectRatio] || ASPECT_RATIOS['3:4'];
  const aspectValue = aspectConfig.width / aspectConfig.height;
  
  // Calculate dimensions
  const baseWidth = request.width || 1920;
  const width = baseWidth;
  const height = request.height || Math.round(baseWidth / aspectValue);
  
  const bounds = getCropLimits(request.latitude, request.longitude, request.distance, aspectValue);
  const theme = request.theme;
  
  // Scale factor for line widths (based on width / 12 like Python script)
  const scaleFactor = width / 1200;
  
  // Font scaling
  const fontScale = height / 1000;
  const fontMultiplier = FONT_SIZE_MULTIPLIERS[request.fontSize] || 1.0;
  
  const titleSize = BASE_FONT_SIZES.title * fontScale * fontMultiplier;
  const subtitleSize = BASE_FONT_SIZES.subtitle * fontScale * fontMultiplier;
  const coordsSize = BASE_FONT_SIZES.coords * fontScale * fontMultiplier;
  const attrSize = BASE_FONT_SIZES.attribution * fontScale;
  
  const textColor = request.customTextColor || theme.text;
  
  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${theme.bg}"/>`;
  
  // Parks
  for (const polygon of data.parks) {
    if (polygon.length < 3) continue;
    const points = polygon.map(([lat, lng]) => {
      const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    svg += `<polygon points="${points}" fill="${theme.parks}"/>`;
  }
  
  // Water
  for (const polygon of data.water) {
    if (polygon.length < 3) continue;
    const points = polygon.map(([lat, lng]) => {
      const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    svg += `<polygon points="${points}" fill="${theme.water}"/>`;
  }
  
  // Streets (draw in order: service -> motorway)
  const streetOrder = ['service', 'residential', 'tertiary', 'secondary', 'primary', 'motorway'];
  
  for (const streetType of streetOrder) {
    const segment = data.streets.find(s => s.type === streetType);
    if (!segment) continue;
    
    const color = getStreetColor(streetType, theme);
    const baseWidth = STREET_WIDTHS[streetType] || 0.4;
    const lineWidth = baseWidth * scaleFactor;
    
    for (const polyline of segment.coordinates) {
      if (polyline.length < 2) continue;
      
      const d = polyline.map(([lat, lng], i) => {
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      
      svg += `<path d="${d}" stroke="${color}" stroke-width="${lineWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }
  
  // Typography
  const cityText = request.city.toUpperCase();
  const countryText = request.country.toUpperCase();
  const coordsText = formatCoordinates(request.latitude, request.longitude);
  
  // City name
  svg += `<text x="${width / 2}" y="${height * TEXT_POSITIONS.title}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${titleSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.title}" letter-spacing="${(TRACKING.title * titleSize).toFixed(1)}px">${cityText}</text>`;
  
  // Country
  svg += `<text x="${width / 2}" y="${height * TEXT_POSITIONS.subtitle}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${subtitleSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.subtitle}" letter-spacing="${(TRACKING.subtitle * subtitleSize).toFixed(1)}px">${countryText}</text>`;
  
  // Coordinates
  svg += `<text x="${width / 2}" y="${height * TEXT_POSITIONS.coords}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${coordsSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.coords}" letter-spacing="${(TRACKING.coords * coordsSize).toFixed(1)}px" opacity="0.7">${coordsText}</text>`;
  
  // Attribution
  svg += `<text x="${width - 10}" y="${height - 10}" text-anchor="end" fill="${textColor}" font-size="${attrSize.toFixed(1)}px" opacity="0.5">© OpenStreetMap contributors</text>`;
  
  svg += '</svg>';
  
  return svg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: RenderRequest = await req.json();

    // Validate required fields
    if (!request.city || !request.latitude || !request.longitude || !request.theme) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rendering poster for ${request.city} at ${request.latitude}, ${request.longitude}`);

    // Fetch street data
    const aspectConfig = ASPECT_RATIOS[request.aspectRatio] || ASPECT_RATIOS['3:4'];
    const aspectValue = aspectConfig.width / aspectConfig.height;
    const compensatedDistance = Math.ceil(
      request.distance * (Math.max(aspectConfig.height, aspectConfig.width) / Math.min(aspectConfig.height, aspectConfig.width)) / 4
    );
    const fetchDistance = Math.max(request.distance, compensatedDistance) * 1.5;

    const data = await fetchStreetData(request.latitude, request.longitude, fetchDistance);
    
    console.log(`Fetched ${data.streets.reduce((sum, s) => sum + s.coordinates.length, 0)} streets, ${data.water.length} water, ${data.parks.length} parks`);

    // Generate SVG
    const svg = generateSVG(request, data);

    // Return SVG (can be converted to PNG on client if needed)
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error rendering poster:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
