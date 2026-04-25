/**
 * PMTiles Data Source
 *
 * Fetches vector tile data from Cloudflare R2 via HTTP Range Requests.
 * Replaces the old Overpass API / Supabase Edge Function approach.
 *
 * The PMTiles file contains the entire planet's OSM data as vector tiles.
 * Only the needed tiles are fetched (a few KB per tile), making it extremely fast.
 *
 * Protomaps basemap layers: buildings, earth, landuse, places, pois, roads, water
 * Properties use: kind, kind_detail (NOT pmap:kind)
 * Railways are in the roads layer (kind=rail, kind_detail=rail/light_rail/subway/tram)
 * Parks/forests are in the landuse layer
 * Rivers/streams are in the water layer (type=2 for lines, type=3 for polygons)
 */

import { PMTiles } from 'pmtiles';
import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

// Your Cloudflare R2 PMTiles URLs
const PLANET_PM_URL = 'https://pub-d29b8093ed2443f2a216149218c6f3ff.r2.dev/planet.pmtiles';

// Precut city PMTiles (store the most requested cities here). Key uses lowercase city-country
// Example: 'tokyo-japan': 'https://.../tokyo.pmtiles'
const CITY_PM_URLS: Record<string, string> = {
  'tokyo-japan': 'https://pub-d29b8093ed2443f2a216149218c6f3ff.r2.dev/cities/tokyo.pmtiles',
  'new york-usa': 'https://pub-d29b8093ed2443f2a216149218c6f3ff.r2.dev/cities/new_york.pmtiles',
  'san francisco-usa': 'https://pub-d29b8093ed2443f2a216149218c6f3ff.r2.dev/cities/san_francisco.pmtiles',
  'london-uk': 'https://pub-d29b8093ed2443f2a216149218c6f3ff.r2.dev/cities/london.pmtiles',
};

// Singleton PMTiles instance (reused across all requests)
let pmtilesInstance: PMTiles | null = null;
let pmtilesCityKey: string | null = null;

function getPMTiles(city?: string, country?: string): PMTiles {
  const key = city && country ? `${city.toLowerCase()}-${country.toLowerCase()}` : null;
  const cityUrl = key ? CITY_PM_URLS[key] : undefined;
  const urlToUse = cityUrl || PLANET_PM_URL;

  if (!pmtilesInstance || pmtilesCityKey !== key) {
    pmtilesInstance = new PMTiles(urlToUse);
    pmtilesCityKey = key;
  }
  return pmtilesInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory tile cache for instant re-renders when toggling layers
// ─────────────────────────────────────────────────────────────────────────────
const tileCache = new Map<string, VectorTile>();
const TILE_CACHE_MAX = 1000;

function getCachedTile(key: string): VectorTile | undefined {
  return tileCache.get(key);
}

function setCachedTile(key: string, tile: VectorTile): void {
  if (tileCache.size >= TILE_CACHE_MAX) {
    const keysToDelete = Array.from(tileCache.keys()).slice(0, 100);
    keysToDelete.forEach(k => tileCache.delete(k));
  }
  tileCache.set(key, tile);
}

// ─────────────────────────────────────────────────────────────────────────────
// Geo utilities
// ─────────────────────────────────────────────────────────────────────────────

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; z: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)), z: zoom };
}

function tilePixelToLatLng(
  tileX: number, tileY: number, zoom: number,
  pixelX: number, pixelY: number, extent: number
): [number, number] {
  const n = Math.pow(2, zoom);
  const lng = ((tileX + pixelX / extent) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + pixelY / extent)) / n)));
  const lat = (latRad * 180) / Math.PI;
  return [lat, lng];
}

/**
 * Calculate zoom level from distance. Supports 100m to 60km+.
 * PMTiles maxZoom is 15, so we cap there.
 *
 * Preview mode drops 1 level above 4km to cut tile data 4x
 * (vertex count is the dominant render cost for large cities).
 */
function distanceToZoom(distance: number, quality: 'preview' | 'fullscreen' = 'fullscreen'): number {
  const fullscreen = (() => {
    if (distance <= 300) return 15;
    if (distance <= 1000) return 14;
    if (distance <= 4000) return 13;
    if (distance <= 10000) return 12;
    if (distance <= 15000) return 11;
    if (distance <= 25000) return 10;
    if (distance <= 40000) return 9;
    if (distance <= 60000) return 8;
    if (distance <= 120000) return 7;
    if (distance <= 200000) return 6;
    return 5;
  })();
  // Preview: one level lower for >=10km so large-radius views reduce tile count.
  // Floor is z12 — city-specific PMTiles files (tokyo.pmtiles etc.) start at z12.
  // Below 10km we keep z12 so city centers always have full street detail.
  if (quality === 'preview' && distance >= 10000) {
    return Math.max(12, fullscreen - 1);
  }
  return fullscreen;
}

/**
 * Calculate tiles for area, limiting total to avoid fetching thousands
 */
function getTilesForArea(lat: number, lng: number, distance: number, zoom: number, maxTiles = 100): { x: number; y: number; z: number }[] {
  const centerTile = latLngToTile(lat, lng, zoom);
  const metersPerTile = 40075000 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
  const tilesNeeded = Math.ceil(distance / metersPerTile) + 1;

  const tiles: { x: number; y: number; z: number }[] = [];
  const n = Math.pow(2, zoom);

  // Fill from center outward (spiral) so truncation at maxTiles is symmetric
  // Collect all valid offsets sorted by distance from center
  const offsets: { dx: number; dy: number; dist: number }[] = [];
  for (let dx = -tilesNeeded; dx <= tilesNeeded; dx++) {
    for (let dy = -tilesNeeded; dy <= tilesNeeded; dy++) {
      const x = centerTile.x + dx;
      const y = centerTile.y + dy;
      if (x >= 0 && x < n && y >= 0 && y < n) {
        offsets.push({ dx, dy, dist: dx * dx + dy * dy });
      }
    }
  }
  offsets.sort((a, b) => a.dist - b.dist);

  for (let i = 0; i < Math.min(offsets.length, maxTiles); i++) {
    tiles.push({ x: centerTile.x + offsets[i].dx, y: centerTile.y + offsets[i].dy, z: zoom });
  }

  return tiles;
}

// ─────────────────────────────────────────────────────────────────────────────
// Road kind mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapRoadKind(kind: string, kindDetail?: string): string {
  if (kindDetail) {
    switch (kindDetail) {
      case 'motorway': case 'motorway_link': return 'motorway';
      case 'trunk': case 'trunk_link': case 'primary': case 'primary_link': return 'primary';
      case 'secondary': case 'secondary_link': return 'secondary';
      case 'tertiary': case 'tertiary_link': return 'tertiary';
      case 'residential': case 'living_street': case 'unclassified': return 'residential';
      case 'service': return 'service';
      case 'footway': case 'cycleway': case 'path': case 'pedestrian':
      case 'steps': case 'track': case 'bridleway': case 'sidewalk':
      case 'corridor': case 'crossing': return 'path';
    }
  }
  switch (kind) {
    case 'highway': return 'motorway';
    case 'major_road': return 'primary';
    case 'medium_road': return 'secondary';
    case 'minor_road': return 'residential';
    case 'path': case 'footway': case 'cycleway': return 'path';
    default: return 'residential';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ramer–Douglas–Peucker simplification on tile-pixel coords.
 * Tolerance is in pixel units (tile extent ~4096). A tolerance of 8 means
 * vertices within ~0.2% of a tile's width from the line get dropped.
 * Iterative implementation — avoids recursion stack overflow for huge rings.
 */
function rdpSimplify(pts: Array<{ x: number; y: number }>, tol: number): Array<{ x: number; y: number }> {
  const n = pts.length;
  if (n < 3 || tol <= 0) return pts;
  const sqTol = tol * tol;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    if (j - i < 2) continue;
    const ax = pts[i].x, ay = pts[i].y;
    const bx = pts[j].x, by = pts[j].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let maxSq = 0, maxK = -1;
    for (let k = i + 1; k < j; k++) {
      const px = pts[k].x - ax, py = pts[k].y - ay;
      let dSq: number;
      if (lenSq === 0) {
        dSq = px * px + py * py;
      } else {
        const t = (px * dx + py * dy) / lenSq;
        if (t <= 0) dSq = px * px + py * py;
        else if (t >= 1) {
          const qx = pts[k].x - bx, qy = pts[k].y - by;
          dSq = qx * qx + qy * qy;
        } else {
          const rx = px - t * dx, ry = py - t * dy;
          dSq = rx * rx + ry * ry;
        }
      }
      if (dSq > maxSq) { maxSq = dSq; maxK = k; }
    }
    if (maxSq > sqTol && maxK !== -1) {
      keep[maxK] = 1;
      stack.push([i, maxK]);
      stack.push([maxK, j]);
    }
  }
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

/** Bounding box size in pixel units. */
function ringPixelSize(ring: Array<{ x: number; y: number }>): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return Math.max(maxX - minX, maxY - minY);
}

interface ExtractOpts {
  /** Simplification tolerance in pixel units (0 = off). */
  simplifyTol?: number;
  /** Drop rings whose bbox diagonal is below this pixel threshold (0 = keep all). */
  minPixelSize?: number;
}

function extractLineGeometry(
  feature: any, tileX: number, tileY: number, zoom: number, opts: ExtractOpts = {},
): [number, number][][] {
  const geometry = feature.loadGeometry();
  const extent = feature.extent;
  const lines: [number, number][][] = [];
  for (const ring of geometry) {
    if (ring.length < 2) continue;
    let pts = ring as Array<{ x: number; y: number }>;
    if (opts.minPixelSize && ringPixelSize(pts) < opts.minPixelSize) continue;
    if (opts.simplifyTol && pts.length > 2) pts = rdpSimplify(pts, opts.simplifyTol);
    if (pts.length < 2) continue;
    const coords: [number, number][] = [];
    for (const point of pts) {
      coords.push(tilePixelToLatLng(tileX, tileY, zoom, point.x, point.y, extent));
    }
    lines.push(coords);
  }
  return lines;
}

function extractPolygonGeometry(
  feature: any, tileX: number, tileY: number, zoom: number, opts: ExtractOpts = {},
): [number, number][][] {
  const geometry = feature.loadGeometry();
  const extent = feature.extent;
  const polygons: [number, number][][] = [];
  for (const ring of geometry) {
    if (ring.length < 3) continue;
    let pts = ring as Array<{ x: number; y: number }>;
    if (opts.minPixelSize && ringPixelSize(pts) < opts.minPixelSize) continue;
    if (opts.simplifyTol && pts.length > 3) pts = rdpSimplify(pts, opts.simplifyTol);
    if (pts.length < 3) continue;
    const coords: [number, number][] = [];
    for (const point of pts) {
      coords.push(tilePixelToLatLng(tileX, tileY, zoom, point.x, point.y, extent));
    }
    if (coords.length > 0) coords.push(coords[0]);
    polygons.push(coords);
  }
  return polygons;
}

function extractPointGeometry(feature: any, tileX: number, tileY: number, zoom: number): [number, number][] {
  const geometry = feature.loadGeometry();
  const extent = feature.extent;
  const points: [number, number][] = [];
  for (const ring of geometry) {
    for (const point of ring) {
      points.push(tilePixelToLatLng(tileX, tileY, zoom, point.x, point.y, extent));
    }
  }
  return points;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data types
// ─────────────────────────────────────────────────────────────────────────────

export interface PMTilesFetchResult {
  streets: { type: string; coordinates: [number, number][][] }[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  parks: [number, number][][];
  forests: [number, number][][];
  buildings: [number, number][][];
  trainStations: [number, number][];
  cableways: [number, number][][];
  lakes: [number, number][][];
  rivers: [number, number][][];
  monuments: [number, number][];
  stadiums: [number, number][][];
}

function emptyResult(): PMTilesFetchResult {
  return {
    streets: [], railways: [], aeroways: [], coastlines: [],
    water: [], parks: [], forests: [], buildings: [],
    trainStations: [], cableways: [], lakes: [], rivers: [],
    monuments: [], stadiums: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile fetching with in-memory cache
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAndDecodeTile(
  pmtiles: PMTiles, x: number, y: number, z: number
): Promise<VectorTile | null> {
  const key = `${z}/${x}/${y}`;
  const cached = getCachedTile(key);
  if (cached) return cached;

  try {
    const tileData = await pmtiles.getZxy(z, x, y);
    if (!tileData || !tileData.data) return null;
    const pbf = new Pbf(new Uint8Array(tileData.data));
    const tile = new VectorTile(pbf);
    setCachedTile(key, tile);
    return tile;
  } catch (err) {
    console.warn(`Failed to fetch tile ${key}:`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile processing - extract features from vector tile
//
// Protomaps basemap layers:
//   buildings  - building polygons (kind=building)
//   earth      - land polygons (kind=earth)
//   landuse    - parks, forests, grass, commercial, etc.
//   places     - city/town/village labels
//   pois       - points of interest
//   roads      - roads + railways + paths (kind=rail for transit)
//   water      - water polygons + lines (rivers, lakes, canals)
// ─────────────────────────────────────────────────────────────────────────────

interface LayerFlags {
  water?: boolean;
  forests?: boolean;
  parks?: boolean;
  railways?: boolean;
  aeroways?: boolean;
  coastlines?: boolean;
  buildings?: boolean;
  lakes?: boolean;
  rivers?: boolean;
}

// Railway kind_detail values in the roads layer
const RAILWAY_KINDS = new Set(['rail', 'light_rail', 'subway', 'tram', 'narrow_gauge', 'monorail']);

// Park-like landuse kinds
const PARK_KINDS = new Set(['park', 'garden', 'playground', 'recreation_ground', 'village_green', 'dog_park', 'nature_reserve']);

// Forest-like landuse kinds
const FOREST_KINDS = new Set(['forest', 'wood']);

// Water kinds that are lakes/ponds
const LAKE_KINDS = new Set(['lake', 'pond', 'reservoir', 'basin', 'water']);

// Water kinds that are rivers/streams (line features)
const RIVER_KINDS = new Set(['river', 'stream', 'canal', 'drain', 'ditch']);

function processTile(
  tile: VectorTile, tileX: number, tileY: number, zoom: number,
  lv: LayerFlags,
  simp: { line: ExtractOpts; poly: ExtractOpts; bldg: ExtractOpts } = { line: {}, poly: {}, bldg: {} },
): PMTilesFetchResult {
  const result = emptyResult();
  const streetsByType = new Map<string, [number, number][][]>();

  // ── ROADS & RAILWAYS (both in the "roads" layer) ──
  const roadsLayer = tile.layers['roads'];
  if (roadsLayer) {
    for (let i = 0; i < roadsLayer.length; i++) {
      const feature = roadsLayer.feature(i);
      const props = feature.properties;
      const kind = (props.kind || '') as string;
      const kindDetail = (props.kind_detail || '') as string;

      // Railways are in roads layer with kind=rail or kind_detail matching rail types
      if (kind === 'rail' || RAILWAY_KINDS.has(kindDetail)) {
        if (lv.railways) {
          result.railways.push(...extractLineGeometry(feature, tileX, tileY, zoom, simp.line));
          // Train stations are POIs, handled below
        }
        continue;
      }

      // Aeroway features (runway, taxiway, etc.)
      if (kind === 'aeroway' || kindDetail === 'runway' || kindDetail === 'taxiway') {
        if (lv.aeroways) {
          result.aeroways.push(...extractLineGeometry(feature, tileX, tileY, zoom, simp.line));
        }
        continue;
      }

      // Skip non-road features like ferry, pier, platform
      if (kind === 'ferry' || kind === 'other') continue;

      // Regular roads
      const streetType = mapRoadKind(kind, kindDetail);
      const lines = extractLineGeometry(feature, tileX, tileY, zoom, simp.line);
      if (lines.length > 0) {
        const existing = streetsByType.get(streetType) || [];
        existing.push(...lines);
        streetsByType.set(streetType, existing);
      }
    }
  }
  result.streets = Array.from(streetsByType.entries()).map(([type, coordinates]) => ({ type, coordinates }));

  // ── WATER (polygons + lines for rivers) ──
  if (lv.water || lv.lakes || lv.rivers) {
    const waterLayer = tile.layers['water'];
    if (waterLayer) {
      for (let i = 0; i < waterLayer.length; i++) {
        const feature = waterLayer.feature(i);
        const kind = (feature.properties.kind || '') as string;
        const geomType = feature.type; // 1=point, 2=line, 3=polygon

        if (geomType === 3) {
          // Polygon water features (lakes, ocean, etc.)
          const polys = extractPolygonGeometry(feature, tileX, tileY, zoom, simp.poly);
          if (lv.water) result.water.push(...polys);
          if (lv.lakes && LAKE_KINDS.has(kind)) {
            result.lakes.push(...polys);
          }
        } else if (geomType === 2) {
          // Line water features (rivers, streams, canals)
          const lines = extractLineGeometry(feature, tileX, tileY, zoom, simp.line);
          if (lv.rivers && RIVER_KINDS.has(kind)) {
            result.rivers.push(...lines);
          }
          if (lv.water) {
            // Also add rivers/streams to general water for rendering
            result.water.push(...lines);
          }
        }
      }
    }
  }

  // ── PARKS & FORESTS (from "landuse" layer) ──
  if (lv.parks || lv.forests) {
    const landuseLayer = tile.layers['landuse'];
    if (landuseLayer) {
      for (let i = 0; i < landuseLayer.length; i++) {
        const feature = landuseLayer.feature(i);
        const kind = (feature.properties.kind || '') as string;

        if (lv.parks && PARK_KINDS.has(kind)) {
          result.parks.push(...extractPolygonGeometry(feature, tileX, tileY, zoom, simp.poly));
        } else if (lv.forests && FOREST_KINDS.has(kind)) {
          result.forests.push(...extractPolygonGeometry(feature, tileX, tileY, zoom, simp.poly));
        }
      }
    }
  }

  // ── BUILDINGS ──
  if (lv.buildings) {
    const buildingsLayer = tile.layers['buildings'];
    if (buildingsLayer) {
      for (let i = 0; i < buildingsLayer.length; i++) {
        const feature = buildingsLayer.feature(i);
        result.buildings.push(...extractPolygonGeometry(feature, tileX, tileY, zoom, simp.bldg));
      }
    }
  }

  // ── TRAIN STATIONS (from "pois" layer) ──
  if (lv.railways) {
    const poisLayer = tile.layers['pois'];
    if (poisLayer) {
      for (let i = 0; i < poisLayer.length; i++) {
        const feature = poisLayer.feature(i);
        const kind = (feature.properties.kind || '') as string;
        const kindDetail = (feature.properties.kind_detail || '') as string;
        if (kind === 'station' || kind === 'halt' || kindDetail === 'station' || kindDetail === 'halt') {
          result.trainStations.push(...extractPointGeometry(feature, tileX, tileY, zoom));
        }
      }
    }
  }

  // ── COASTLINES (from "earth" layer) ──
  if (lv.coastlines) {
    const earthLayer = tile.layers['earth'];
    if (earthLayer) {
      for (let i = 0; i < earthLayer.length; i++) {
        const feature = earthLayer.feature(i);
        result.coastlines.push(...extractPolygonGeometry(feature, tileX, tileY, zoom, simp.poly));
      }
    }
  }

  // ── MONUMENTS & STADIUMS (from "pois" layer) ──
  const poisLayer = tile.layers['pois'];
  if (poisLayer) {
    for (let i = 0; i < poisLayer.length; i++) {
      const feature = poisLayer.feature(i);
      const kind = (feature.properties.kind || '') as string;
      const kindDetail = (feature.properties.kind_detail || '') as string;
      if (kind === 'monument' || kind === 'memorial' || kindDetail === 'monument' || kindDetail === 'memorial') {
        result.monuments.push(...extractPointGeometry(feature, tileX, tileY, zoom));
      }
      if (kind === 'stadium' || kindDetail === 'stadium') {
        result.stadiums.push(...extractPolygonGeometry(feature, tileX, tileY, zoom, simp.poly));
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge results
// ─────────────────────────────────────────────────────────────────────────────

function mergeResults(results: PMTilesFetchResult[]): PMTilesFetchResult {
  const merged = emptyResult();
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
    merged.parks.push(...result.parks);
    merged.forests.push(...result.forests);
    merged.buildings.push(...result.buildings);
    merged.trainStations.push(...result.trainStations);
    merged.cableways.push(...result.cableways);
    merged.lakes.push(...result.lakes);
    merged.rivers.push(...result.rivers);
    merged.monuments.push(...result.monuments);
    merged.stadiums.push(...result.stadiums);
  }

  merged.streets = Array.from(streetsByType.entries()).map(([type, coordinates]) => ({ type, coordinates }));
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Precache system — pre-processed JSON on R2 for popular cities
// ─────────────────────────────────────────────────────────────────────────────

const R2_BASE = 'https://pub-d29b8093ed2443f2a216149218c6f3ff.r2.dev';

// Top 30 popular cities — coordinates rounded to 2 decimals to match geoKey
export const PRECACHE_CITIES = [
  { name: 'New York',      lat: 40.71, lng: -74.01 },
  { name: 'Tokyo',         lat: 35.68, lng: 139.65 },
  { name: 'London',        lat: 51.51, lng: -0.13 },
  { name: 'Paris',         lat: 48.86, lng: 2.35 },
  { name: 'Berlin',        lat: 52.52, lng: 13.41 },
  { name: 'Rome',          lat: 41.90, lng: 12.50 },
  { name: 'Barcelona',     lat: 41.39, lng: 2.17 },
  { name: 'Amsterdam',     lat: 52.37, lng: 4.90 },
  { name: 'Vienna',        lat: 48.21, lng: 16.37 },
  { name: 'Prague',        lat: 50.08, lng: 14.44 },
  { name: 'Sydney',        lat: -33.87, lng: 151.21 },
  { name: 'San Francisco', lat: 37.77, lng: -122.42 },
  { name: 'Los Angeles',   lat: 34.05, lng: -118.24 },
  { name: 'Chicago',       lat: 41.88, lng: -87.63 },
  { name: 'Dubai',         lat: 25.20, lng: 55.27 },
  { name: 'Singapore',     lat: 1.35, lng: 103.82 },
  { name: 'Hong Kong',     lat: 22.32, lng: 114.17 },
  { name: 'Munich',        lat: 48.14, lng: 11.58 },
  { name: 'Milan',         lat: 45.46, lng: 9.19 },
  { name: 'Lisbon',        lat: 38.72, lng: -9.14 },
  { name: 'Madrid',        lat: 40.42, lng: -3.70 },
  { name: 'Istanbul',      lat: 41.01, lng: 28.98 },
  { name: 'Seoul',         lat: 37.57, lng: 126.98 },
  { name: 'Bangkok',       lat: 13.76, lng: 100.50 },
  { name: 'Moscow',        lat: 55.76, lng: 37.62 },
  { name: 'Buenos Aires',  lat: -34.60, lng: -58.38 },
  { name: 'Cairo',         lat: 30.04, lng: 31.24 },
  { name: 'Mumbai',        lat: 19.08, lng: 72.88 },
  { name: 'Toronto',       lat: 43.65, lng: -79.38 },
  { name: 'Hamburg',        lat: 53.55, lng: 9.99 },
];

// Distances we precache (geoKey rounds to nearest 2000m)
const PRECACHE_DISTANCES = [6000];
// Building variants: b0 (without) and b1 (with)
const PRECACHE_BUILDING_VARIANTS = [0, 1];

/**
 * Build the precache key, matching the geoKey format from useStreetData.
 * Format: "40.71_-74.01_6000_b1" (underscores for URL safety)
 */
export function precacheKey(lat: number, lng: number, distance: number, buildings: boolean): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${distance}_b${buildings ? 1 : 0}`;
}

/**
 * Check if a geoKey matches a precached city.
 * geoKey format from useStreetData: "40.71--74.01-6000-b0"
 */
function geoKeyToPrecacheKey(geoKey: string): string | null {
  // Parse: "40.71--74.01-6000-b0" → lat=40.71, lng=-74.01, dist=6000, b=0
  const match = geoKey.match(/^(-?\d+\.\d+)-(-?\d+\.\d+)-(\d+)-b([01])$/);
  if (!match) return null;
  const [, lat, lng, dist, b] = match;
  const key = `${lat}_${lng}_${dist}_b${b}`;
  return key;
}

// Track which precache keys exist on R2 (checked once per session)
const precacheAvailable = new Map<string, boolean>();
// Promise singleton — all callers await the *same* fetch so no race condition
// where precacheManifestLoaded=true but precacheAvailable is still empty.
let precacheManifestPromise: Promise<void> | null = null;

// In-memory precache result cache — survives layer toggles / re-renders within session
const precacheResultCache = new Map<string, PMTilesFetchResult>();
// In-flight fetch promises — prevent duplicate network requests for the same key
const precacheFetchInFlight = new Map<string, Promise<PMTilesFetchResult | null>>();

/**
 * Load the precache manifest from R2 (lists available precache files).
 * Safe to call multiple times — returns the same Promise every time so
 * concurrent callers all await the actual network completion.
 */
function loadPrecacheManifest(): Promise<void> {
  if (!precacheManifestPromise) {
    precacheManifestPromise = (async () => {
      try {
        const resp = await fetch(`${R2_BASE}/precache/manifest.json`, { cache: 'force-cache' });
        if (!resp.ok) return;
        const keys: string[] = await resp.json();
        keys.forEach(k => precacheAvailable.set(k, true));
        console.log(`[Precache] Manifest loaded: ${keys.length} cities available`);
      } catch {
        // No manifest = no precache, fall through to normal tile fetch
      }
    })();
  }
  return precacheManifestPromise;
}

/**
 * Resolve a geoKey to the matching R2 precache key (exact or fuzzy).
 * Returns null if no precache exists for this location.
 * Caller must ensure manifest is already loaded before calling.
 */
function resolvePrecacheKey(geoKey: string): string | null {
  const key = geoKeyToPrecacheKey(geoKey);
  if (!key) return null;

  // ① Exact match
  if (precacheAvailable.has(key)) return key;

  // ② Fuzzy match — same distance + building flag, nearest centroid within 0.15°
  const km = key.match(/^(-?\d+\.\d+)_(-?\d+\.\d+)_(\d+)_b([01])$/);
  if (!km) return null;

  const latF = parseFloat(km[1]), lngF = parseFloat(km[2]);
  const dist = km[3], b = km[4];
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const k of precacheAvailable.keys()) {
    const m = k.match(/^(-?\d+\.\d+)_(-?\d+\.\d+)_(\d+)_b([01])$/);
    if (!m || m[3] !== dist || m[4] !== b) continue;
    const d = Math.sqrt((parseFloat(m[1]) - latF) ** 2 + (parseFloat(m[2]) - lngF) ** 2);
    if (d < 0.15 && d < bestDist) { bestDist = d; bestKey = k; }
  }
  if (bestKey) {
    console.log(`[Precache] Fuzzy match: ${key} → ${bestKey} (${bestDist.toFixed(3)}°)`);
    return bestKey;
  }
  return null;
}

/**
 * Fetch one precache file from R2 and save it to memory + IDB.
 * Uses an in-flight promise map so concurrent callers share one request.
 */
function fetchPrecacheFromR2(resolvedKey: string, idbKey: string): Promise<PMTilesFetchResult | null> {
  // Return existing in-flight fetch if one is already running for this key
  const existing = precacheFetchInFlight.get(resolvedKey);
  if (existing) return existing;

  const promise = (async (): Promise<PMTilesFetchResult | null> => {
    try {
      const url = `${R2_BASE}/precache/${resolvedKey}.json`;
      const resp = await fetch(url, { cache: 'force-cache' });
      if (!resp.ok) return null;
      const data: PMTilesFetchResult = await resp.json();
      console.log(`[Precache] ⚡ Loaded from R2: ${resolvedKey}`);
      // Save to memory cache for instant access this session
      precacheResultCache.set(resolvedKey, data);
      // Save to IDB so next page load is instant (no network needed)
      // Use both the resolvedKey and the idbKey (geoKey format) so idbGet hits
      idbPut(idbKey, data);
      return data;
    } catch {
      return null;
    } finally {
      precacheFetchInFlight.delete(resolvedKey);
    }
  })();

  precacheFetchInFlight.set(resolvedKey, promise);
  return promise;
}

/**
 * Try to load precached data for a given geoKey.
 * Cache hierarchy: memory → R2 (with in-flight dedup).
 * After first load the result is in IDB, so fetchMapData's idbGet() picks it
 * up on the next session — no R2 round-trip needed.
 */
async function tryLoadPrecache(geoKey: string): Promise<PMTilesFetchResult | null> {
  // Ensure manifest is loaded (no-op if already done)
  await loadPrecacheManifest();

  const resolvedKey = resolvePrecacheKey(geoKey);
  if (!resolvedKey) return null;

  // ① Memory cache — instant
  const cached = precacheResultCache.get(resolvedKey);
  if (cached) return cached;

  // ② R2 fetch (deduplicated via in-flight map, saved to IDB on success)
  // IDB key uses the geoKey format so fetchMapData's idbGet() can hit it next session
  return fetchPrecacheFromR2(resolvedKey, geoKey);
}

/**
 * Eagerly start fetching precache data for a specific city/distance.
 * Call this at app startup so data is ready (or in flight) when the map renders.
 */
export function warmPrecache(lat: number, lng: number, distance: number, buildings: boolean): void {
  const roundedDist = Math.round(distance / 2000) * 2000 || 2000;
  const baseGeoKey = `${lat.toFixed(2)}-${lng.toFixed(2)}-${roundedDist}-b${buildings ? 1 : 0}`;
  // Fire and forget — the promise is stored in precacheFetchInFlight so
  // when fetchMapData calls tryLoadPrecache it reuses the same request
  loadPrecacheManifest().then(() => {
    const resolvedKey = resolvePrecacheKey(baseGeoKey);
    if (!resolvedKey) return;
    if (precacheResultCache.has(resolvedKey)) return; // already in memory
    fetchPrecacheFromR2(resolvedKey, baseGeoKey + '-qp'); // warm preview variant
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB cache for processed results (all cities, persists across sessions)
// ─────────────────────────────────────────────────────────────────────────────

const IDB_NAME = 'cityscape-map-cache';
const IDB_STORE = 'processed-results';
const IDB_VERSION = 3; // Bumped: tightened hasContent check — clears entries with water but 0 streets
const IDB_MAX_ENTRIES = 50;

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}

async function idbGet(key: string): Promise<PMTilesFetchResult | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbPut(key: string, data: PMTilesFetchResult): Promise<void> {
  try {
    const db = await getIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);

    // Evict oldest entries if over limit
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result >= IDB_MAX_ENTRIES) {
        const cursorReq = store.openCursor();
        let deleted = 0;
        const toDelete = countReq.result - IDB_MAX_ENTRIES + 5;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };

    store.put(data, key);
  } catch {
    // Silently fail — cache is best-effort
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all map data for a location.
 * Checks three levels of cache before doing tile-by-tile fetching:
 *   1. R2 precache (pre-processed JSON for popular cities)
 *   2. IndexedDB (processed results from previous sessions)
 *   3. In-memory tile cache (current session)
 *
 * Optional onProgress callback receives partial results as tiles arrive,
 * allowing progressive rendering instead of waiting for all tiles.
 */
export async function fetchMapData(
  lat: number,
  lng: number,
  distance: number,
  layerVisibility: LayerFlags = {},
  onProgress?: (partial: PMTilesFetchResult) => void,
  opts: { quality?: 'preview' | 'fullscreen'; city?: string; country?: string } = {},
): Promise<PMTilesFetchResult> {
  const startTime = performance.now();
  const roundedDist = Math.round(distance / 2000) * 2000 || 2000;
  const wantBuildings = !!layerVisibility.buildings;
  const qSuffix = opts.quality === 'fullscreen' ? 'f' : 'p';
  // Base geoKey (without quality) — for precache hits (precache is always full-detail)
  const baseGeoKey = `${lat.toFixed(2)}-${lng.toFixed(2)}-${roundedDist}-b${wantBuildings ? 1 : 0}`;
  const geoKey = `${baseGeoKey}-q${qSuffix}`;

  // ① + ② Run precache and IndexedDB checks in PARALLEL — no serial waiting.
  //   Precache is quality-agnostic (always full detail), IDB is quality-specific.
  const [precached, idbCached] = await Promise.all([
    tryLoadPrecache(baseGeoKey),
    idbGet(geoKey),
  ]);

  if (precached) {
    const elapsed = performance.now() - startTime;
    console.log(`[PMTiles] ⚡ Precache hit in ${elapsed.toFixed(0)}ms`);
    return precached;
  }
  if (idbCached) {
    const streetCount = idbCached.streets.reduce((sum, s) => sum + s.coordinates.length, 0);
    // Require at least 5 streets — catches stale entries where water loaded but roads failed.
    // Ocean/very-rural areas that genuinely have 0 streets will simply refetch (fast, rare).
    const hasContent = streetCount >= 5;
    if (hasContent) {
      const elapsed = performance.now() - startTime;
      console.log(`[PMTiles] 💾 IndexedDB hit in ${elapsed.toFixed(0)}ms: ${streetCount} streets`);
      return idbCached;
    }
    console.warn(`[PMTiles] IDB entry invalid (${streetCount} streets), refetching tiles...`);
  }

  // ③ Normal tile-by-tile fetch (all tiles in parallel via HTTP/2 multiplexing)
  const pmtiles = getPMTiles(opts.city, opts.country);
  const isFullscreen = opts.quality === 'fullscreen';
  const zoom = distanceToZoom(distance, isFullscreen ? 'fullscreen' : 'preview');

  // Cap tiles - balanced for speed and coverage
  const maxBaseTiles = isFullscreen ? (zoom >= 13 ? 96 : 72) : (zoom >= 13 ? 56 : 42);
  const tiles = getTilesForArea(lat, lng, distance, zoom, maxBaseTiles);

  // Simplification settings: preview gets aggressive RDP + min-size filter,
  // fullscreen keeps full detail so exports look crisp.
  // Tolerance is in MVT pixel units (extent=4096 per tile).
  const simp = isFullscreen
    ? { line: { simplifyTol: 1 }, poly: { simplifyTol: 1 }, bldg: {} }
    : {
        // Preview: ~8px lines, ~12px polys, ~6px buildings, drop sub-pixel features
        line: { simplifyTol: 8, minPixelSize: 4 },
        poly: { simplifyTol: 12, minPixelSize: 8 },
        bldg: { simplifyTol: 6, minPixelSize: 6 },
      };

  console.log(`[PMTiles] Fetching ${tiles.length} tiles at z${zoom} for ${distance}m (${opts.quality || 'preview'})`);

  // Prepare building tiles in parallel with base tiles.
  // Fullscreen: z14 for detail, z13 for >8km.
  // Building tile zoom: use z14 for close-up detail, z13 for larger radii.
  // Preview uses z13 (same as fullscreen >8km) — city PMTiles have z13 data.
  let buildingTiles: { x: number; y: number; z: number }[] = [];
  const buildingZoom = distance > 8000 ? 13 : 14;
  if (layerVisibility.buildings && zoom < buildingZoom) {
    const bMetersPerTile = 40075000 * Math.cos(lat * Math.PI / 180) / Math.pow(2, buildingZoom);
    const bTilesNeeded = Math.ceil(distance / bMetersPerTile) + 1;
    const bTotalNeeded = (2 * bTilesNeeded + 1) ** 2;
    const maxBuildingTiles = isFullscreen ? Math.min(220, bTotalNeeded) : Math.min(160, bTotalNeeded);
    buildingTiles = getTilesForArea(lat, lng, distance, buildingZoom, maxBuildingTiles);
    console.log(`[PMTiles] +${buildingTiles.length} building tiles at z${buildingZoom}`);
  }

  // Fire ALL tile fetches in parallel (HTTP/2 multiplexes over 1-2 connections).
  // Progressive rendering strategy:
  //   • First-paint: emit after the very first center tile arrives (no throttle) so
  //     the user sees streets immediately instead of waiting for all tiles.
  //   • Subsequent updates: throttle to ~120ms to avoid thrashing the renderer.
  //   • Final update always fires when all tiles are done.
  const buildingLv: LayerFlags = { buildings: true };
  const progressResults: PMTilesFetchResult[] = [];
  let progressCount = 0;
  let firstPaintDone = false;
  const totalTiles = tiles.length + buildingTiles.length;
  let lastProgressTime = 0;

  const processTileWithProgress = async (
    tile: { x: number; y: number; z: number },
    lv: LayerFlags,
    isCenterTile: boolean,
  ): Promise<PMTilesFetchResult> => {
    const vt = await fetchAndDecodeTile(pmtiles, tile.x, tile.y, tile.z);
    const result = vt ? processTile(vt, tile.x, tile.y, tile.z, lv, simp) : emptyResult();
    progressCount++;
    progressResults.push(result);

    if (onProgress) {
      const now = performance.now();
      const isLast = progressCount === totalTiles;
      // First-paint: fire immediately when center tile arrives (no throttle)
      const isFirstPaint = isCenterTile && !firstPaintDone;
      // Throttled update every ~120ms after that
      const isThrottledUpdate = now - lastProgressTime > 120;

      if (isFirstPaint || isThrottledUpdate || isLast) {
        if (isFirstPaint) firstPaintDone = true;
        lastProgressTime = now;
        onProgress(mergeResults(progressResults));
      }
    }
    return result;
  };

  // Mark the 4 innermost center tiles so they trigger first-paint
  const centerSet = new Set(tiles.slice(0, 4).map(t => `${t.z}/${t.x}/${t.y}`));

  const allResults = await Promise.all([
    ...tiles.map(tile => processTileWithProgress(
      tile, layerVisibility, centerSet.has(`${tile.z}/${tile.x}/${tile.y}`),
    )),
    ...buildingTiles.map(tile => processTileWithProgress(tile, buildingLv, false)),
  ]);

  const merged = mergeResults(allResults);
  const elapsed = performance.now() - startTime;

  const streetCount = merged.streets.reduce((sum, s) => sum + s.coordinates.length, 0);
  console.log(`[PMTiles] Done in ${elapsed.toFixed(0)}ms: ${streetCount} streets, ${merged.buildings.length} buildings, ${merged.water.length} water, ${merged.parks.length} parks, ${merged.forests.length} forests, ${merged.railways.length} railways`);

  // Store in IndexedDB for next session (fire-and-forget)
  idbPut(geoKey, merged);

  return merged;
}

/**
 * Prefetch the PMTiles header + precache manifest on app load,
 * then immediately start warming the precache for the default city (Tokyo 6km).
 * Called at module-load time so data arrives before React even mounts.
 */
export async function prefetchPMTilesHeader(
  warmLat = 35.68, warmLng = 139.65, warmDist = 6000
): Promise<void> {
  try {
    const [pmtiles] = await Promise.all([
      getPMTiles(),
      loadPrecacheManifest(),
    ]);
    await pmtiles.getHeader();
    console.log('[PMTiles] Header prefetched');
    // Warm the precache for the startup city so it's ready when React mounts
    warmPrecache(warmLat, warmLng, warmDist, false);
    warmPrecache(warmLat, warmLng, warmDist, true);
  } catch (err) {
    console.warn('[PMTiles] Header prefetch failed:', err);
  }
}

/**
 * Round all coordinates in a result to 5 decimal places (~1m accuracy).
 * Reduces JSON size by ~40% by eliminating unnecessary float precision.
 */
function compactResult(result: PMTilesFetchResult): PMTilesFetchResult {
  const r5 = (n: number) => Math.round(n * 100000) / 100000;
  const compactCoord = (c: [number, number]): [number, number] => [r5(c[0]), r5(c[1])];
  const compactLine = (line: [number, number][]): [number, number][] => line.map(compactCoord);
  const compactPolys = (polys: [number, number][][]): [number, number][][] => polys.map(compactLine);

  return {
    streets: result.streets.map((s) => ({ type: s.type, coordinates: compactPolys(s.coordinates) })),
    railways: compactPolys(result.railways),
    aeroways: compactPolys(result.aeroways),
    coastlines: compactPolys(result.coastlines),
    water: compactPolys(result.water),
    parks: compactPolys(result.parks),
    forests: compactPolys(result.forests),
    buildings: compactPolys(result.buildings),
    trainStations: result.trainStations.map(compactCoord),
    cableways: compactPolys(result.cableways),
    lakes: compactPolys(result.lakes),
    rivers: compactPolys(result.rivers),
    monuments: result.monuments.map(compactCoord),
    stadiums: compactPolys(result.stadiums),
  };
}

/**
 * Generate precache data for a city (used by the generation page).
 * Fetches ALL layers including buildings so the precache is complete.
 * Coordinates are rounded to 5 decimals for compact JSON.
 */
export async function generatePrecacheForCity(
  lat: number, lng: number, distance: number, withBuildings: boolean,
): Promise<{ key: string; data: PMTilesFetchResult }> {
  const allLayers: LayerFlags = {
    water: true, forests: true, parks: true, railways: true,
    aeroways: true, coastlines: true, buildings: withBuildings,
    lakes: true, rivers: true,
  };

  const pmtiles = getPMTiles();
  const zoom = distanceToZoom(distance);
  const maxBaseTiles = zoom >= 13 ? 64 : 49;
  const tiles = getTilesForArea(lat, lng, distance, zoom, maxBaseTiles);

  let buildingTiles: { x: number; y: number; z: number }[] = [];
  if (withBuildings && zoom < 14) {
    const bMetersPerTile = 40075000 * Math.cos(lat * Math.PI / 180) / Math.pow(2, 14);
    const bTilesNeeded = Math.ceil(distance / bMetersPerTile) + 1;
    const bTotalNeeded = (2 * bTilesNeeded + 1) ** 2;
    buildingTiles = getTilesForArea(lat, lng, distance, 14, Math.min(200, bTotalNeeded));
  }

  const buildingLv: LayerFlags = { buildings: true };
  const allPromises = [
    ...tiles.map(async (tile) => {
      const vt = await fetchAndDecodeTile(pmtiles, tile.x, tile.y, tile.z);
      if (!vt) return emptyResult();
      return processTile(vt, tile.x, tile.y, tile.z, allLayers);
    }),
    ...buildingTiles.map(async (tile) => {
      const vt = await fetchAndDecodeTile(pmtiles, tile.x, tile.y, tile.z);
      if (!vt) return emptyResult();
      return processTile(vt, tile.x, tile.y, tile.z, buildingLv);
    }),
  ];

  const merged = mergeResults(await Promise.all(allPromises));
  const compacted = compactResult(merged);
  const key = precacheKey(lat, lng, distance, withBuildings);
  return { key, data: compacted };
}
