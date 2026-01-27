import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedTile, setCachedTile, getTileCacheKey, clearOldCache } from '@/lib/streetDataCache';
export interface StreetSegment {
  type: 'motorway' | 'primary' | 'secondary' | 'tertiary' | 'residential' | 'service' | 'path';
  coordinates: [number, number][][]; // Array of polylines
}

interface UseStreetDataProps {
  latitude: number;
  longitude: number;
  distance: number;
  enabled?: boolean;
  includeBuildings?: boolean;
}

interface UseStreetDataResult {
  streets: StreetSegment[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  parks: [number, number][][];
  forests: [number, number][][];
  buildings: [number, number][][];
  isLoading: boolean;
  error: string | null;
}

interface TileResult {
  streets: StreetSegment[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  parks: [number, number][][];
  forests: [number, number][][];
  buildings: [number, number][][];
}

// Tile radii
// Streets can be larger; buildings must be smaller to avoid backend memory spikes in dense areas.
const MAX_STREET_TILE_RADIUS = 5000;
const MAX_BUILDING_TILE_RADIUS = 2500;

// Maximum tiles to prevent excessive requests
const MAX_TILES_STREETS = 36; // good coverage for large areas
const MAX_TILES_BUILDINGS = 64; // buildings use smaller tiles, so need more for full coverage

// Batch sizes for parallel fetching
// NOTE: Too high concurrency can increase backend memory pressure; keep buildings slightly lower.
const STREET_BATCH_SIZE = 15;
const BUILDING_BATCH_SIZE = 6;

// Calculate tiles needed for a given area - ensures center is always included
function calculateTiles(params: {
  lat: number;
  lng: number;
  distance: number;
  tileRadius: number;
  maxTiles: number;
}): { lat: number; lng: number; radius: number }[] {
  const { lat, lng, distance, tileRadius, maxTiles } = params;

  // For small areas, single tile is enough
  if (distance <= tileRadius) {
    return [{ lat, lng, radius: distance }];
  }

  const tiles: { lat: number; lng: number; radius: number }[] = [];

  // CRITICAL: Always start with exact center tile at the user's coordinates
  tiles.push({ lat, lng, radius: tileRadius });

  // Tile spacing with overlap for seamless coverage
  const tileSpacing = tileRadius * 1.6;
  const numTilesPerSide = Math.ceil(distance / tileSpacing);
  
  if (numTilesPerSide <= 1) {
    return tiles;
  }

  // Calculate offset in degrees
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  const latStep = tileSpacing / metersPerDegreeLat;
  const lngStep = tileSpacing / metersPerDegreeLng;

  // Add cardinal directions first (N, S, E, W) to fill gaps around center
  const cardinalOffsets = [
    { dLat: latStep, dLng: 0 },      // North
    { dLat: -latStep, dLng: 0 },     // South
    { dLat: 0, dLng: lngStep },      // East
    { dLat: 0, dLng: -lngStep },     // West
  ];
  
  for (const offset of cardinalOffsets) {
    if (tiles.length < maxTiles) {
      tiles.push({ lat: lat + offset.dLat, lng: lng + offset.dLng, radius: tileRadius });
    }
  }

  // Add diagonal tiles
  const diagonalOffsets = [
    { dLat: latStep, dLng: lngStep },    // NE
    { dLat: latStep, dLng: -lngStep },   // NW
    { dLat: -latStep, dLng: lngStep },   // SE
    { dLat: -latStep, dLng: -lngStep },  // SW
  ];
  
  for (const offset of diagonalOffsets) {
    if (tiles.length < maxTiles) {
      tiles.push({ lat: lat + offset.dLat, lng: lng + offset.dLng, radius: tileRadius });
    }
  }

  // Add outer ring tiles for larger areas
  for (let ring = 2; ring <= numTilesPerSide && tiles.length < maxTiles; ring++) {
    // Top and bottom rows of this ring
    for (let col = -ring; col <= ring && tiles.length < maxTiles; col++) {
      tiles.push({ lat: lat + ring * latStep, lng: lng + col * lngStep, radius: tileRadius });
      if (tiles.length < maxTiles) {
        tiles.push({ lat: lat - ring * latStep, lng: lng + col * lngStep, radius: tileRadius });
      }
    }
    // Left and right columns (excluding corners already added)
    for (let row = -ring + 1; row <= ring - 1 && tiles.length < maxTiles; row++) {
      tiles.push({ lat: lat + row * latStep, lng: lng + ring * lngStep, radius: tileRadius });
      if (tiles.length < maxTiles) {
        tiles.push({ lat: lat + row * latStep, lng: lng - ring * lngStep, radius: tileRadius });
      }
    }
  }

  console.log(
    `Created ${tiles.length} tiles for ${distance}m radius (tileRadius=${tileRadius}m, center: ${lat.toFixed(3)}, ${lng.toFixed(3)})`
  );
  return tiles;
}

// Merge multiple tile results, deduplicating where possible
function mergeResults(results: TileResult[]): TileResult {
  const merged: TileResult = {
    streets: [],
    railways: [],
    aeroways: [],
    coastlines: [],
    water: [],
    parks: [],
    forests: [],
    buildings: [],
  };

  // Create maps to aggregate streets by type
  const streetsByType = new Map<string, [number, number][][]>();

  for (const result of results) {
    // Merge streets by type
    for (const street of result.streets) {
      const existing = streetsByType.get(street.type) || [];
      existing.push(...street.coordinates);
      streetsByType.set(street.type, existing);
    }

    // Merge other features (simple concat - some duplication at edges is acceptable)
    merged.railways.push(...result.railways);
    merged.aeroways.push(...result.aeroways);
    merged.coastlines.push(...result.coastlines);
    merged.water.push(...result.water);
    merged.parks.push(...result.parks);
    merged.forests.push(...result.forests);
    merged.buildings.push(...(result.buildings || []));
  }

  // Convert back to StreetSegment array
  merged.streets = Array.from(streetsByType.entries()).map(([type, coordinates]) => ({
    type: type as StreetSegment['type'],
    coordinates,
  }));

  return merged;
}

export const useStreetData = ({
  latitude,
  longitude,
  distance,
  enabled = true,
  includeBuildings = false,
}: UseStreetDataProps): UseStreetDataResult => {
  const [streets, setStreets] = useState<StreetSegment[]>([]);
  const [railways, setRailways] = useState<[number, number][][]>([]);
  const [aeroways, setAeroways] = useState<[number, number][][]>([]);
  const [coastlines, setCoastlines] = useState<[number, number][][]>([]);
  const [water, setWater] = useState<[number, number][][]>([]);
  const [parks, setParks] = useState<[number, number][][]>([]);
  const [forests, setForests] = useState<[number, number][][]>([]);
  const [buildings, setBuildings] = useState<[number, number][][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastParamsRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTileWithRetry = useCallback(async (
    tileLat: number,
    tileLng: number,
    tileRadius: number,
    skipService: boolean,
    fetchBuildings: boolean,
    buildingsOnly: boolean,
    retries = 1
  ): Promise<TileResult | null> => {
    const cacheKey =
      getTileCacheKey(tileLat, tileLng, tileRadius) +
      (fetchBuildings ? (buildingsOnly ? '-bld-only' : '-bld') : '');
    
    // Try IndexedDB cache first (24h TTL) - instant!
    const cached = await getCachedTile(cacheKey);
    if (cached) {
      return cached as TileResult;
    }
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('fetch-streets', {
          body: {
            lat: tileLat,
            lng: tileLng,
            distance: tileRadius,
            skipService,
            includeBuildings: fetchBuildings,
            buildingsOnly,
          },
        });

        if (fnError) {
          if (attempt < retries) {
            // Wait before retry with exponential backoff
            await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
            continue;
          }
          console.error('Tile fetch error after retries:', fnError);
          return null;
        }

        const result: TileResult = {
          streets: data?.streets || [],
          railways: data?.railways || [],
          aeroways: data?.aeroways || [],
          coastlines: data?.coastlines || [],
          water: data?.water || [],
          parks: data?.parks || [],
          forests: data?.forests || [],
          buildings: data?.buildings || [],
        };
        
        // Cache in IndexedDB for future use
        await setCachedTile(cacheKey, result);
        
        return result;
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
          continue;
        }
        console.error('Tile fetch exception:', err);
        return null;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const paramsKey = `${latitude.toFixed(4)}-${longitude.toFixed(4)}-${distance}-${includeBuildings}`;
    
    if (paramsKey === lastParamsRef.current) return;

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      // Clean old cache entries periodically
      clearOldCache();

      abortControllerRef.current = new AbortController();

      try {
        // Calculate tiles for the full area
        const streetTiles = calculateTiles({
          lat: latitude,
          lng: longitude,
          distance,
          tileRadius: MAX_STREET_TILE_RADIUS,
          maxTiles: MAX_TILES_STREETS,
        });

        const buildingTiles = includeBuildings
          ? calculateTiles({
              lat: latitude,
              lng: longitude,
              distance,
              tileRadius: MAX_BUILDING_TILE_RADIUS,
              maxTiles: MAX_TILES_BUILDINGS,
            })
          : [];
        
        const skipService = false;
        console.log(
          `Fetching ${streetTiles.length} street tiles + ${buildingTiles.length} building tiles (parallel)`
        );

        // PARALLEL FETCH: Streets and buildings use SAME tiles for full coverage
        // Both fetch simultaneously for 2x speed
        const streetFetchPromise = (async () => {
          const results: TileResult[] = [];
          for (let i = 0; i < streetTiles.length; i += STREET_BATCH_SIZE) {
            const batch = streetTiles.slice(i, i + STREET_BATCH_SIZE);
            const batchResults = await Promise.all(
              batch.map(tile => fetchTileWithRetry(tile.lat, tile.lng, tile.radius, skipService, false, false))
            );
            for (const result of batchResults) {
              if (result) results.push(result);
            }
          }
          return results;
        })();

        const buildingFetchPromise = (async () => {
          if (!includeBuildings) return [];
          const results: TileResult[] = [];
          // Buildings use smaller tiles for stability, but cover the full area
          for (let i = 0; i < buildingTiles.length; i += BUILDING_BATCH_SIZE) {
            const batch = buildingTiles.slice(i, i + BUILDING_BATCH_SIZE);
            const batchResults = await Promise.all(
              // buildingsOnly=true prevents huge mixed responses that can trigger WORKER_LIMIT
              batch.map(tile => fetchTileWithRetry(tile.lat, tile.lng, tile.radius, skipService, true, true))
            );
            for (const result of batchResults) {
              if (result) results.push(result);
            }
          }
          return results;
        })();

        // Wait for both to complete simultaneously
        const [streetResults, buildingResults] = await Promise.all([
          streetFetchPromise,
          buildingFetchPromise
        ]);

        if (streetResults.length === 0) {
          setError('Failed to fetch street data');
          return;
        }

        // Merge street results
        const merged = mergeResults(streetResults);
        
        // Merge building results from their separate tiles
        if (buildingResults.length > 0) {
          const buildingMerged = mergeResults(buildingResults);
          merged.buildings = buildingMerged.buildings;
          console.log(`Loaded ${merged.buildings.length} buildings from ${buildingResults.length} tiles`);
        }

        console.log('Merged data:', {
          streets: merged.streets.reduce((sum, s) => sum + s.coordinates.length, 0),
          buildings: merged.buildings.length,
          tiles: streetTiles.length,
        });

        setStreets(merged.streets);
        setRailways(merged.railways);
        setAeroways(merged.aeroways);
        setCoastlines(merged.coastlines);
        setWater(merged.water);
        setParks(merged.parks);
        setForests(merged.forests);
        setBuildings(merged.buildings);
        lastParamsRef.current = paramsKey;

      } catch (err) {
        console.error('Error fetching streets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, 100); // 100ms debounce for faster response

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [latitude, longitude, distance, enabled, includeBuildings, fetchTileWithRetry]);

  return { streets, railways, aeroways, coastlines, water, parks, forests, buildings, isLoading, error };
};
