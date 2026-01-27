/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TextPositionOffset {
  x: number;
  y: number;
}

type TextOrientation = 'horizontal' | 'vertical';

interface TextElementConfig {
  position?: TextPositionOffset;
  scale?: number;
  orientation?: TextOrientation;
}

interface TextOverrides {
  city?: TextElementConfig;
  country?: TextElementConfig;
  coordinates?: TextElementConfig;
}

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
    railway?: string;
  };
  fontFamily: string;
  fontSize: string;
  fontSizeScale?: number; // Fine-tuning multiplier (0.5 - 2.0)
  customTextColor?: string;
  customMotorwayColor?: string;
  customRoadColor?: string;
  width?: number;
  height?: number;
  showGradients?: boolean;
  showCity?: boolean;
  showCountry?: boolean;
  showCoordinates?: boolean;
  textPosition?: 'bottom' | 'center' | 'top';
  textOverrides?: TextOverrides; // Custom text positions and sizes
  layerVisibility?: {
    water: boolean;
    forests: boolean;
    parks: boolean;
    railways: boolean;
    aeroways: boolean;
    coastlines: boolean;
    buildings: boolean;
  };
  layerColors?: {
    water?: string;
    forests?: string;
    parks?: string;
    railways?: string;
    aeroways?: string;
    coastlines?: string;
    buildings?: string;
  };
}

interface StreetSegment {
  type: string;
  coordinates: [number, number][][];
}

// Railway width
const RAILWAY_WIDTH = 0.6;

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
  pedestrian: 0.25,
  footway: 0.2,
  path: 0.2,
  cycleway: 0.2,
  track: 0.2,
  steps: 0.15,
  bridleway: 0.2,
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

// Typography positions - position-dependent, MUST match posterTypography.ts
const TEXT_POSITIONS_BOTTOM = {
  title: 0.82,
  decorativeLine: 0.86,
  subtitle: 0.895,
  coords: 0.935,
  attribution: 0.98,
};

const TEXT_POSITIONS_CENTER = {
  title: 0.46,
  decorativeLine: 0.50,
  subtitle: 0.535,
  coords: 0.575,
  attribution: 0.98,
};

const TEXT_POSITIONS_TOP = {
  title: 0.08,
  decorativeLine: 0.12,
  subtitle: 0.155,
  coords: 0.195,
  attribution: 0.98,
};

function getTextPositions(position: 'bottom' | 'center' | 'top' | undefined) {
  switch (position) {
    case 'top': return TEXT_POSITIONS_TOP;
    case 'center': return TEXT_POSITIONS_CENTER;
    default: return TEXT_POSITIONS_BOTTOM;
  }
}

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

// Font stacks for SVG rendering - must match posterTypography.ts
const FONT_STACKS: Record<string, string> = {
  mono: '"Roboto Mono", ui-monospace, monospace',
  sans: 'Inter, system-ui, sans-serif',
  serif: '"Cormorant Garamond", Georgia, serif',
  display: '"Bebas Neue", Impact, sans-serif',
  elegant: '"Playfair Display", Georgia, serif',
  condensed: 'Oswald, "Arial Narrow", sans-serif',
  script: '"Dancing Script", cursive',
  retro: '"Righteous", cursive',
  minimal: '"Raleway", sans-serif',
  brutalist: '"Space Grotesk", sans-serif',
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
  { type: 'service', tags: ['service', 'pedestrian'] },
  { type: 'path', tags: ['footway', 'path', 'cycleway', 'track', 'steps', 'bridleway'] },
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

  // IMPORTANT: Keep a true 90° orthographic feel by ensuring the same meter-per-pixel
  // scale on both axes. Adjust in meters first, then convert to degrees per axis.
  // This MUST match CanvasPosterPreview.tsx getCropLimits() for visual parity.
  let halfWidthMeters = distance;
  let halfHeightMeters = distance;

  if (aspectValue > 1) {
    // wide: keep width, reduce height
    halfHeightMeters = halfWidthMeters / aspectValue;
  } else if (aspectValue < 1) {
    // tall: keep height, reduce width
    halfWidthMeters = halfHeightMeters * aspectValue;
  }

  const halfX = halfWidthMeters / metersPerDegreeLng;
  const halfY = halfHeightMeters / metersPerDegreeLat;

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

function getStreetColor(type: string, theme: RenderRequest['theme'], customMotorwayColor?: string, customRoadColor?: string): string {
  if (['motorway', 'motorway_link'].includes(type)) {
    return customMotorwayColor || theme.roadMotorway;
  }
  if (customRoadColor) {
    return customRoadColor;
  }
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

// Adjust color for forests (slightly darker than parks)
function adjustForestColor(hexColor: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  if (!result) return hexColor;
  
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  
  // Darken by 20 and boost green slightly
  r = Math.max(0, r - 20);
  g = Math.max(0, Math.min(255, g - 10));
  b = Math.max(0, b - 25);
  
  return `rgb(${r}, ${g}, ${b})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overpass Data Fetching with Tile-based approach for large areas
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TILE_RADIUS = 5000; // 5km per tile for stability
// Increased tile count for full coverage matching preview
const MAX_TILES = 9; // More tiles for better coverage

interface TileResult {
  streets: StreetSegment[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  forests: [number, number][][];
  parks: [number, number][][];
  buildings: [number, number][][];
}

function calculateTiles(lat: number, lng: number, distance: number): { lat: number; lng: number; radius: number }[] {
  // Always use single tile for small areas
  if (distance <= MAX_TILE_RADIUS * 1.2) {
    return [{ lat, lng, radius: Math.min(distance, MAX_TILE_RADIUS) }];
  }

  const tiles: { lat: number; lng: number; radius: number }[] = [];
  tiles.push({ lat, lng, radius: MAX_TILE_RADIUS });

  const tileSpacing = MAX_TILE_RADIUS * 1.4;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  const latStep = tileSpacing / metersPerDegreeLat;
  const lngStep = tileSpacing / metersPerDegreeLng;

  // Cardinal directions for better coverage
  const offsets = [
    { dLat: latStep, dLng: 0 },      // N
    { dLat: -latStep, dLng: 0 },     // S
    { dLat: 0, dLng: lngStep },      // E
    { dLat: 0, dLng: -lngStep },     // W
    { dLat: latStep, dLng: lngStep },    // NE
    { dLat: latStep, dLng: -lngStep },   // NW
    { dLat: -latStep, dLng: lngStep },   // SE
    { dLat: -latStep, dLng: -lngStep },  // SW
  ];

  for (const offset of offsets) {
    if (tiles.length < MAX_TILES) {
      tiles.push({ lat: lat + offset.dLat, lng: lng + offset.dLng, radius: MAX_TILE_RADIUS });
    }
  }

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
      [out:json][timeout:30];
      (
        way["highway"~"^(${highwayTags.join('|')})$"](${bbox});
        way["railway"~"^(rail|light_rail|subway|tram)$"](${bbox});
        way["aeroway"~"^(runway|taxiway)$"](${bbox});
        way["natural"="coastline"](${bbox});
        way["natural"="water"](${bbox});
        way["waterway"~"^(river|canal|riverbank)$"](${bbox});
        way["landuse"="forest"](${bbox});
        way["natural"="wood"](${bbox});
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
        way["railway"~"^(rail|light_rail|subway|tram)$"](${bbox});
        way["aeroway"~"^(runway|taxiway)$"](${bbox});
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
    return { streets: [], railways: [], aeroways: [], coastlines: [], water: [], forests: [], parks: [], buildings: [] };
  }

  const osmData = await response.json();
  const elements = osmData.elements || [];

  const tagToType = new Map<string, string>();
  for (const st of activeStreetTypes) {
    for (const tag of st.tags) tagToType.set(tag, st.type);
  }

  const coordsByType = new Map<string, [number, number][][]>();
  for (const st of activeStreetTypes) coordsByType.set(st.type, []);

  const railwayLines: [number, number][][] = [];
  const aerowayLines: [number, number][][] = [];
  const coastlineLines: [number, number][][] = [];
  const waterPolygons: [number, number][][] = [];
  const forestPolygons: [number, number][][] = [];
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
    } else if (tags.railway) {
      // Parse railway lines
      const points: [number, number][] = [];
      for (const pt of geom) {
        if (pt && pt.lat !== undefined && pt.lon !== undefined) {
          points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
        }
      }
      if (points.length >= 2) {
        railwayLines.push(points);
      }
    } else if (tags.aeroway) {
      // Parse aeroway lines (runways, taxiways)
      const points: [number, number][] = [];
      for (const pt of geom) {
        if (pt && pt.lat !== undefined && pt.lon !== undefined) {
          points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
        }
      }
      if (points.length >= 2) {
        aerowayLines.push(points);
      }
    } else if (tags.natural === 'coastline') {
      // Parse coastlines
      const points: [number, number][] = [];
      for (const pt of geom) {
        if (pt && pt.lat !== undefined && pt.lon !== undefined) {
          points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
        }
      }
      if (points.length >= 2) {
        coastlineLines.push(points);
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
    } else if (tags.landuse === 'forest' || tags.natural === 'wood') {
      // Parse forests
      const points: [number, number][] = [];
      for (const pt of geom) {
        if (pt && pt.lat !== undefined && pt.lon !== undefined) {
          points.push([roundCoord(pt.lat), roundCoord(pt.lon)]);
        }
      }
      if (points.length >= 3) {
        forestPolygons.push(points);
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

  return { 
    streets, 
    railways: railwayLines, 
    aeroways: aerowayLines, 
    coastlines: coastlineLines,
    water: waterPolygons, 
    forests: forestPolygons,
    parks: parkPolygons,
    buildings: []  // Buildings handled separately if needed
  };
}

function mergeResults(results: TileResult[]): TileResult {
  const merged: TileResult = { 
    streets: [], 
    railways: [], 
    aeroways: [], 
    coastlines: [],
    water: [], 
    forests: [],
    parks: [],
    buildings: []
  };
  const streetsByType = new Map<string, [number, number][][]>();

  for (const result of results) {
    for (const street of result.streets) {
      const existing = streetsByType.get(street.type) || [];
      existing.push(...street.coordinates);
      streetsByType.set(street.type, existing);
    }
    merged.railways.push(...result.railways);
    merged.aeroways.push(...result.aeroways);
    merged.coastlines.push(...result.coastlines);
    merged.water.push(...result.water);
    merged.forests.push(...result.forests);
    merged.parks.push(...result.parks);
    merged.buildings.push(...(result.buildings || []));
  }

  merged.streets = Array.from(streetsByType.entries()).map(([type, coordinates]) => ({
    type,
    coordinates,
  }));

  return merged;
}

async function fetchStreetData(lat: number, lng: number, distance: number): Promise<{
  streets: StreetSegment[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  forests: [number, number][][];
  parks: [number, number][][];
  buildings: [number, number][][];
}> {
  // Adaptive street type selection to stay within edge runtime CPU limits.
  // Dense areas (large cities) can exceed CPU when rendering thousands of small service/residential segments.
  // We keep major roads always; optionally skip the most expensive minor categories for large radii.
  const includeMinorRoads = distance <= 6500;
  // Major + residential always; service roads are the most expensive at large radius.
  const activeStreetTypes = includeMinorRoads
    ? ALL_STREET_TYPES.slice(0, 6) // motorway..service (exclude 'path')
    : ALL_STREET_TYPES.slice(0, 5); // motorway..residential (exclude 'service' + 'path')

  const includeWaterParks = distance <= 9000; // Keep layers for reasonable distances

  const tiles = calculateTiles(lat, lng, distance);
  console.log(`Fetching ${tiles.length} tiles for distance ${distance}m`);

  // Fetch tiles SEQUENTIALLY to reduce peak memory usage
  const results: TileResult[] = [];

  for (const tile of tiles) {
    const result = await fetchSingleTile(tile.lat, tile.lng, tile.radius, activeStreetTypes, includeWaterParks);
    results.push(result);
  }

  return mergeResults(results);
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Generation (matching Python maptoposter output)
// ─────────────────────────────────────────────────────────────────────────────

function generateSVG(request: RenderRequest, data: {
  streets: StreetSegment[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  forests: [number, number][][];
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
  
  // Font scaling with fontSizeScale support
  const fontScale = height / 1000;
  const fontMultiplier = FONT_SIZE_MULTIPLIERS[request.fontSize] || 1.0;
  const fontSizeScale = request.fontSizeScale || 1.0;
  
  const titleSize = BASE_FONT_SIZES.title * fontScale * fontMultiplier * fontSizeScale;
  const subtitleSize = BASE_FONT_SIZES.subtitle * fontScale * fontMultiplier * fontSizeScale;
  const coordsSize = BASE_FONT_SIZES.coords * fontScale * fontMultiplier * fontSizeScale;
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
  
  // Default layer visibility (matches frontend DEFAULT_LAYER_VISIBILITY)
  const layerVisibility = request.layerVisibility || {
    water: true,
    forests: false, // Disabled by default for faster loading
    parks: false, // Disabled by default for faster loading
    railways: true,
    aeroways: true,
    coastlines: false, // Disabled by default for faster loading
    buildings: false,
  };
  
  // Layer 0.5: Coastlines (z-order 0.5 - first layer)
  if (layerVisibility.coastlines) {
    const coastlineColor = request.layerColors?.coastlines || theme.water;
    const coastlineStrokeWidth = 0.8 * scaleFactor;
    const dParts: string[] = [];
    for (const polyline of data.coastlines) {
      if (polyline.length < 2) continue;
      for (let i = 0; i < polyline.length; i++) {
        const [lat, lng] = polyline[i];
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        dParts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
      }
    }
    if (dParts.length) {
      svg += `<path d="${dParts.join(' ')}" stroke="${coastlineColor}" stroke-width="${coastlineStrokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }
  
  // Layer 1: Water (z-order 1)
  if (layerVisibility.water) {
    const waterColor = request.layerColors?.water || theme.water;
    for (const polygon of data.water) {
      if (polygon.length < 3) continue;
      const points = polygon.map(([lat, lng]) => {
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      svg += `<polygon points="${points}" fill="${waterColor}"/>`;
    }
  }
  
  // Layer 1.5: Forests (z-order 1.5)
  if (layerVisibility.forests) {
    const forestColor = request.layerColors?.forests || adjustForestColor(theme.parks);
    for (const polygon of data.forests) {
      if (polygon.length < 3) continue;
      const points = polygon.map(([lat, lng]) => {
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      svg += `<polygon points="${points}" fill="${forestColor}"/>`;
    }
  }
  
  // Layer 2: Parks (z-order 2)
  if (layerVisibility.parks) {
    const parksColor = request.layerColors?.parks || theme.parks;
    for (const polygon of data.parks) {
      if (polygon.length < 3) continue;
      const points = polygon.map(([lat, lng]) => {
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      svg += `<polygon points="${points}" fill="${parksColor}"/>`;
    }
  }
  
  // Layer 2.3: Aeroways (z-order 2.3 - runways and taxiways)
  if (layerVisibility.aeroways) {
    const aerowayColor = request.layerColors?.aeroways || '#E8D44D';
    const aerowayStrokeWidth = 1.5 * scaleFactor;
    const dParts: string[] = [];
    for (const polyline of data.aeroways) {
      if (polyline.length < 2) continue;
      for (let i = 0; i < polyline.length; i++) {
        const [lat, lng] = polyline[i];
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        dParts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
      }
    }
    if (dParts.length) {
      svg += `<path d="${dParts.join(' ')}" stroke="${aerowayColor}" stroke-width="${aerowayStrokeWidth.toFixed(2)}" stroke-linecap="butt" stroke-linejoin="miter" fill="none"/>`;
    }
  }
  
  // Layer 2.5: Railways (z-order 2.5 - between aeroways and streets)
  if (layerVisibility.railways) {
    const railwayColor = request.layerColors?.railways || theme.railway || theme.roadPrimary;
    const railwayStrokeWidth = RAILWAY_WIDTH * scaleFactor;
    const dParts: string[] = [];
    for (const polyline of data.railways) {
      if (polyline.length < 2) continue;
      for (let i = 0; i < polyline.length; i++) {
        const [lat, lng] = polyline[i];
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        dParts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
      }
    }
    if (dParts.length) {
      svg += `<path d="${dParts.join(' ')}" stroke="${railwayColor}" stroke-width="${railwayStrokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }
  
  // Layer 3: Streets (z-order 3) - draw in order: service -> motorway
  const streetOrder = ['service', 'residential', 'tertiary', 'secondary', 'primary', 'motorway'];
  
  for (const streetType of streetOrder) {
    const segment = data.streets.find((s) => s.type === streetType);
    if (!segment || segment.coordinates.length === 0) continue;

    const color = getStreetColor(streetType, theme, request.customMotorwayColor, request.customRoadColor);
    const baseLineWidth = STREET_WIDTHS[streetType] || 0.4;
    const strokeWidth = baseLineWidth * scaleFactor;

    // Performance: combine all polylines of same style into a single path string.
    const dParts: string[] = [];
    for (const polyline of segment.coordinates) {
      if (polyline.length < 2) continue;
      for (let i = 0; i < polyline.length; i++) {
        const [lat, lng] = polyline[i];
        const { x, y } = toCanvasCoords(lat, lng, width, height, bounds);
        dParts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
      }
    }

    if (dParts.length) {
      svg += `<path d="${dParts.join(' ')}" stroke="${color}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
  }
  
  // Layer 4: Gradient fades (z-order 10 in Python)
  if (request.showGradients !== false) {
    const fadeHeight = height * 0.25; // 25% of height for each fade
    svg += `<rect x="0" y="0" width="${width}" height="${fadeHeight}" fill="url(#topFade)"/>`;
    svg += `<rect x="0" y="${height - fadeHeight}" width="${width}" height="${fadeHeight}" fill="url(#bottomFade)"/>`;
  }
  
  // Get text positions based on textPosition setting
  const TEXT_POSITIONS = getTextPositions(request.textPosition);
  
  // Helper functions for text override support
  const getTextPos = (elementId: 'city' | 'country' | 'coordinates', defaultY: number) => {
    const override = request.textOverrides?.[elementId];
    if (override?.position) {
      return {
        x: override.position.x * width,
        y: override.position.y * height,
      };
    }
    return { x: width / 2, y: height * defaultY };
  };

  const getTextScale = (elementId: 'city' | 'country' | 'coordinates') => {
    return request.textOverrides?.[elementId]?.scale || 1;
  };

  const getTextOrientation = (elementId: 'city' | 'country' | 'coordinates'): TextOrientation => {
    return request.textOverrides?.[elementId]?.orientation || 'horizontal';
  };
  
  // Layer 5: Typography (z-order 11 in Python)
  const cityText = request.city.toUpperCase();
  const countryText = request.country.toUpperCase();
  const coordsText = formatCoordinates(request.latitude, request.longitude);
  
  // Get font family from request or fallback to mono
  const fontFamily = FONT_STACKS[request.fontFamily] || FONT_STACKS.mono;
  
  // City name with letter spacing - auto-scale to fit width (only if showCity)
  if (request.showCity !== false) {
    const cityScale = getTextScale('city');
    const cityPos = getTextPos('city', TEXT_POSITIONS.title);
    const cityOrientation = getTextOrientation('city');
    const isVertical = cityOrientation === 'vertical';
    
    const charWidth = titleSize * 0.6;
    const letterSpacing = TRACKING.title * titleSize;
    const estimatedTextWidth = cityText.length * charWidth + (cityText.length - 1) * letterSpacing;
    const maxTextWidth = width * 0.9;
    
    let adjustedTitleSize = titleSize * cityScale;
    if (estimatedTextWidth > maxTextWidth && !isVertical) {
      const scaleFactor = maxTextWidth / estimatedTextWidth;
      adjustedTitleSize = adjustedTitleSize * scaleFactor;
    }
    const adjustedLetterSpacing = TRACKING.title * adjustedTitleSize;
    
    const transform = isVertical ? ` transform="rotate(-90, ${cityPos.x.toFixed(1)}, ${cityPos.y.toFixed(1)})"` : '';
    svg += `<text x="${cityPos.x.toFixed(1)}" y="${cityPos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${adjustedTitleSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.title}" letter-spacing="${adjustedLetterSpacing.toFixed(1)}px" font-family="${fontFamily}"${transform}>${cityText}</text>`;
    
    // Decorative line between city and country (only if no custom position)
    if (!request.textOverrides?.city?.position) {
      svg += `<line x1="${(width - lineLength) / 2}" y1="${height * TEXT_POSITIONS.decorativeLine}" x2="${(width + lineLength) / 2}" y2="${height * TEXT_POSITIONS.decorativeLine}" stroke="${textColor}" stroke-width="${lineWidth.toFixed(2)}" opacity="0.6"/>`;
    }
  }
  
  // Country (only if showCountry)
  if (request.showCountry !== false) {
    const countryScale = getTextScale('country');
    const countryPos = getTextPos('country', TEXT_POSITIONS.subtitle);
    const countryOrientation = getTextOrientation('country');
    const isVertical = countryOrientation === 'vertical';
    const countryFontSize = subtitleSize * countryScale;
    
    const transform = isVertical ? ` transform="rotate(-90, ${countryPos.x.toFixed(1)}, ${countryPos.y.toFixed(1)})"` : '';
    svg += `<text x="${countryPos.x.toFixed(1)}" y="${countryPos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${countryFontSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.subtitle}" letter-spacing="${(TRACKING.subtitle * countryFontSize).toFixed(1)}px" font-family="${fontFamily}"${transform}>${countryText}</text>`;
  }
  
  // Coordinates (only if showCoordinates)
  if (request.showCoordinates !== false) {
    const coordsScale = getTextScale('coordinates');
    const coordsPos = getTextPos('coordinates', TEXT_POSITIONS.coords);
    const coordsOrientation = getTextOrientation('coordinates');
    const isVertical = coordsOrientation === 'vertical';
    const coordsFontSize = coordsSize * coordsScale;
    
    const transform = isVertical ? ` transform="rotate(-90, ${coordsPos.x.toFixed(1)}, ${coordsPos.y.toFixed(1)})"` : '';
    svg += `<text x="${coordsPos.x.toFixed(1)}" y="${coordsPos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${coordsFontSize.toFixed(1)}px" font-weight="${FONT_WEIGHTS.coords}" letter-spacing="${(TRACKING.coords * coordsFontSize).toFixed(1)}px" font-family="${fontFamily}" opacity="0.7"${transform}>${coordsText}</text>`;
  }
  
  // Attribution
  svg += `<text x="${width - 10}" y="${height - 10}" text-anchor="end" fill="${textColor}" font-size="${attrSize.toFixed(1)}px" font-family="${fontFamily}" opacity="0.5">© OpenStreetMap contributors</text>`;
  
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
    
    // Calculate the fetch distance to fully cover the visible area.
    // The getCropLimits function uses `distance` as the half-width/height in meters,
    // adjusted by aspect ratio. We need to fetch data for the FULL visible bounds.
    // For tall posters (aspect < 1), the width is `distance * aspect`, height is `distance`.
    // For wide posters (aspect > 1), the width is `distance`, height is `distance / aspect`.
    // The diagonal of the visible area determines the minimum fetch radius.
    const visibleHalfWidth = aspectValue >= 1 ? request.distance : request.distance * aspectValue;
    const visibleHalfHeight = aspectValue >= 1 ? request.distance / aspectValue : request.distance;
    const diagonalDistance = Math.sqrt(visibleHalfWidth ** 2 + visibleHalfHeight ** 2);
    
    // Add 10% buffer to ensure edge coverage, cap to prevent memory issues
    const fetchDistance = Math.min(12000, Math.ceil(diagonalDistance * 1.1));

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
