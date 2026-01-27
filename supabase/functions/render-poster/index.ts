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
  width?: number;
  height?: number;
  showGradients?: boolean; // Enable/disable gradient fades
  showDecorativeLine?: boolean; // Enable/disable line between city and country
}

interface StreetSegment {
  type: string;
  coordinates: [number, number][][];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants from maptoposter Python script
// https://github.com/Chanathip999/maptoposter/blob/main/create_map_poster.py
// ─────────────────────────────────────────────────────────────────────────────

// Street widths from get_edge_widths_by_type() - lines 231-240
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

// Typography from Python script - using ax.transAxes (normalized 0-1 coordinates)
// Python positions from BOTTOM, so we convert: SVG_Y = 1 - PYTHON_Y
const TEXT_POSITIONS = {
  title: 0.86,           // City: Python y=0.14 → 1-0.14 = 0.86
  decorativeLine: 0.875, // Line: Python y=0.125 → 1-0.125 = 0.875
  subtitle: 0.90,        // Country: Python y=0.10 → 1-0.10 = 0.90
  coords: 0.93,          // Coords: Python y=0.07 → 1-0.07 = 0.93
  attribution: 0.98,     // Attribution: Python y=0.02 → 1-0.02 = 0.98
};

// Letter spacing (tracking) in em units
const TRACKING = {
  title: 0.3,
  subtitle: 0.15,
  coords: 0.05,
};

const FONT_WEIGHTS = {
  title: 700,    // Bold
  subtitle: 300, // Light
  coords: 400,   // Regular
};

// Base font sizes at 1000px height
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

// Gradient fade positions from Python script (lines 150-182)
// create_gradient_fade: top gradient at y=0.75-1.0, bottom at y=0.0-0.25
const GRADIENT_CONFIG = {
  topStart: 0.0,    // SVG: starts at top
  topEnd: 0.25,     // Python: 1.0 to 0.75 → SVG: 0.0 to 0.25
  bottomStart: 0.75, // Python: 0.25 to 0.0 → SVG: 0.75 to 1.0
  bottomEnd: 1.0,
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

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Overpass Data Fetching with Tile-based approach for large areas
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TILE_RADIUS = 5000; // 5km per tile for stability
// Keep this low to avoid CPU limits during export renders
const MAX_TILES = 5; // center + 4 cardinal directions

interface TileResult {
  streets: StreetSegment[];
  water: [number, number][][];
  parks: [number, number][][];
}

function calculateTiles(lat: number, lng: number, distance: number): { lat: number; lng: number; radius: number }[] {
  if (distance <= MAX_TILE_RADIUS) {
    return [{ lat, lng, radius: distance }];
  }

  const tiles: { lat: number; lng: number; radius: number }[] = [];
  tiles.push({ lat, lng, radius: MAX_TILE_RADIUS });

  const tileSpacing = MAX_TILE_RADIUS * 1.6;
  const numTilesPerSide = Math.ceil(distance / tileSpacing);
  
  if (numTilesPerSide <= 1) return tiles;

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  const latStep = tileSpacing / metersPerDegreeLat;
  const lngStep = tileSpacing / metersPerDegreeLng;

  // Add surrounding tiles in a cross pattern (much cheaper than 3x3)
  tiles.push({ lat: lat + latStep, lng, radius: MAX_TILE_RADIUS });
  tiles.push({ lat: lat - latStep, lng, radius: MAX_TILE_RADIUS });
  tiles.push({ lat, lng: lng + lngStep, radius: MAX_TILE_RADIUS });
  tiles.push({ lat, lng: lng - lngStep, radius: MAX_TILE_RADIUS });

  console.log(`Created ${tiles.length} tiles for ${distance}m radius`);
  return tiles;
}

async function fetchSingleTile(
  tileLat: number,
  tileLng: number,
  radius: number,
  activeStreetTypes: typeof ALL_STREET_TYPES,
  includeWaterParks: boolean
): Promise<TileResult> {
  const latDelta = radius / 111320;
  const lngDelta = radius / (111320 * Math.cos(tileLat * Math.PI / 180));
  
  const south = tileLat - latDelta;
  const north = tileLat + latDelta;
  const west = tileLng - lngDelta;
  const east = tileLng + lngDelta;

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
    console.error('Tile fetch failed, returning empty');
    return { streets: [], water: [], parks: [] };
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

function mergeResults(results: TileResult[]): TileResult {
  const merged: TileResult = { streets: [], water: [], parks: [] };
  const streetsByType = new Map<string, [number, number][][]>();

  for (const result of results) {
    for (const street of result.streets) {
      const existing = streetsByType.get(street.type) || [];
      existing.push(...street.coordinates);
      streetsByType.set(street.type, existing);
    }
    merged.water.push(...result.water);
    merged.parks.push(...result.parks);
  }

  merged.streets = Array.from(streetsByType.entries()).map(([type, coordinates]) => ({
    type,
    coordinates,
  }));

  return merged;
}

async function fetchStreetData(lat: number, lng: number, distance: number): Promise<{
  streets: StreetSegment[];
  water: [number, number][][];
  parks: [number, number][][];
}> {
  // Keep exports stable: still render fine streets (residential/tertiary) but drop ultra-dense service
  // for large radii to prevent CPU limits.
  const activeStreetTypes = distance > 8000
    ? ALL_STREET_TYPES.filter((t) => t.type !== 'service')
    : ALL_STREET_TYPES;
  const includeWaterParks = distance <= 10000;

  const tiles = calculateTiles(lat, lng, distance);
  console.log(`Fetching ${tiles.length} tiles for distance ${distance}m`);

  // Fetch tiles in parallel (max 3 at a time to avoid rate limits)
  const results: TileResult[] = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const batch = tiles.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(tile => fetchSingleTile(tile.lat, tile.lng, tile.radius, activeStreetTypes, includeWaterParks))
    );
    results.push(...batchResults);
  }

  return mergeResults(results);
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Generation (matching Python maptoposter output)
// ─────────────────────────────────────────────────────────────────────────────

function generateSVG(request: RenderRequest, data: {
  streets: StreetSegment[];
  water: [number, number][][];
  parks: [number, number][][];
}): string {
  const aspectConfig = ASPECT_RATIOS[request.aspectRatio] || ASPECT_RATIOS['3:4'];
  const aspectValue = aspectConfig.width / aspectConfig.height;
  
  const baseWidth = request.width || 1920;
  const width = baseWidth;
  const height = request.height || Math.round(baseWidth / aspectValue);
  
  const bounds = getCropLimits(request.latitude, request.longitude, request.distance, aspectValue);
  const theme = request.theme;
  
  // Scale factor for line widths (matching Python: width / 1200)
  const scaleFactor = width / 1200;
  
  // Font scaling
  const fontScale = height / 1000;
  const fontMultiplier = FONT_SIZE_MULTIPLIERS[request.fontSize] || 1.0;
  
  const titleSize = BASE_FONT_SIZES.title * fontScale * fontMultiplier;
  const subtitleSize = BASE_FONT_SIZES.subtitle * fontScale * fontMultiplier;
  const coordsSize = BASE_FONT_SIZES.coords * fontScale * fontMultiplier;
  const attrSize = BASE_FONT_SIZES.attribution * fontScale;
  
  const textColor = request.customTextColor || theme.text;
  const bgRgb = hexToRgb(theme.bg);
  
  // Decorative line width (matching Python: 0.1 * city font size)
  const lineWidth = titleSize * 0.02;
  const lineLength = width * 0.15; // 15% of width
  
  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Gradient definitions for fade effect (matching Python create_gradient_fade)
  if (request.showGradients !== false) {
    svg += `
      <defs>
        <linearGradient id="topFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="bottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})" stop-opacity="0"/>
          <stop offset="100%" stop-color="rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})" stop-opacity="1"/>
        </linearGradient>
      </defs>
    `;
  }
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${theme.bg}"/>`;
  
  // Layer 1: Parks (z-order 2 in Python)
  for (const polygon of data.parks) {
    if (polygon.length < 3) continue;
    const points = polygon.map(([lat, lng]) => {
      const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    svg += `<polygon points="${points}" fill="${theme.parks}"/>`;
  }
  
  // Layer 2: Water (z-order 1 in Python)
  for (const polygon of data.water) {
    if (polygon.length < 3) continue;
    const points = polygon.map(([lat, lng]) => {
      const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    svg += `<polygon points="${points}" fill="${theme.water}"/>`;
  }
  
  // Layer 3: Streets (z-order 3 in Python) - draw in order: service -> motorway
  const streetOrder = ['service', 'residential', 'tertiary', 'secondary', 'primary', 'motorway'];
  
  for (const streetType of streetOrder) {
    const segment = data.streets.find(s => s.type === streetType);
    if (!segment) continue;
    
    const color = getStreetColor(streetType, theme);
    const baseLineWidth = STREET_WIDTHS[streetType] || 0.4;
    const strokeWidth = baseLineWidth * scaleFactor;
    
    for (const polyline of segment.coordinates) {
      if (polyline.length < 2) continue;
      
      const d = polyline.map(([lat, lng], i) => {
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      
      svg += `<path d="${d}" stroke="${color}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }
  
  // Layer 4: Gradient fades (z-order 10 in Python)
  if (request.showGradients !== false) {
    const fadeHeight = height * 0.25; // 25% of height for each fade
    svg += `<rect x="0" y="0" width="${width}" height="${fadeHeight}" fill="url(#topFade)"/>`;
    svg += `<rect x="0" y="${height - fadeHeight}" width="${width}" height="${fadeHeight}" fill="url(#bottomFade)"/>`;
  }
  
  // Layer 5: Typography (z-order 11 in Python)
  const cityText = request.city.toUpperCase();
  const countryText = request.country.toUpperCase();
  const coordsText = formatCoordinates(request.latitude, request.longitude);
  
  // City name (spaced uppercase letters)
  const spacedCity = cityText.split('').join(' ');
  svg += `<text x="${width / 2}" y="${height * TEXT_POSITIONS.title}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${titleSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.title}" letter-spacing="${(TRACKING.title * titleSize).toFixed(1)}px" font-family="system-ui, -apple-system, sans-serif">${spacedCity}</text>`;
  
  // Decorative line between city and country (matching Python y=0.125)
  if (request.showDecorativeLine !== false) {
    svg += `<line x1="${(width - lineLength) / 2}" y1="${height * TEXT_POSITIONS.decorativeLine}" x2="${(width + lineLength) / 2}" y2="${height * TEXT_POSITIONS.decorativeLine}" stroke="${textColor}" stroke-width="${lineWidth.toFixed(2)}" opacity="0.6"/>`;
  }
  
  // Country
  svg += `<text x="${width / 2}" y="${height * TEXT_POSITIONS.subtitle}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${subtitleSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.subtitle}" letter-spacing="${(TRACKING.subtitle * subtitleSize).toFixed(1)}px" font-family="system-ui, -apple-system, sans-serif">${countryText}</text>`;
  
  // Coordinates
  svg += `<text x="${width / 2}" y="${height * TEXT_POSITIONS.coords}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${coordsSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.coords}" letter-spacing="${(TRACKING.coords * coordsSize).toFixed(1)}px" font-family="system-ui, -apple-system, sans-serif" opacity="0.7">${coordsText}</text>`;
  
  // Attribution
  svg += `<text x="${width - 10}" y="${height - 10}" text-anchor="end" fill="${textColor}" font-size="${attrSize.toFixed(1)}px" font-family="system-ui, -apple-system, sans-serif" opacity="0.5">© OpenStreetMap contributors</text>`;
  
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

    if (!request.city || !request.latitude || !request.longitude || !request.theme) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rendering poster for ${request.city} at ${request.latitude}, ${request.longitude}`);

    const aspectConfig = ASPECT_RATIOS[request.aspectRatio] || ASPECT_RATIOS['3:4'];
    const aspectValue = aspectConfig.width / aspectConfig.height;
    // Fetch only slightly beyond the crop area. Too large here explodes street count and hits CPU limits.
    const aspectCompensation = Math.max(aspectConfig.height, aspectConfig.width) / Math.min(aspectConfig.height, aspectConfig.width);
    const compensatedDistance = Math.ceil(request.distance * aspectCompensation);
    const fetchDistance = Math.min(12000, Math.ceil(Math.max(request.distance, compensatedDistance) * 1.15));

    const data = await fetchStreetData(request.latitude, request.longitude, fetchDistance);
    
    console.log(`Fetched ${data.streets.reduce((sum, s) => sum + s.coordinates.length, 0)} streets, ${data.water.length} water, ${data.parks.length} parks`);

    const svg = generateSVG(request, data);

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
