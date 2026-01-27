import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedTile, setCachedTile, getTileCacheKey, clearOldCache } from '@/lib/streetDataCache';
import { withConcurrencyLimit, getCurrentInFlight } from '@/lib/fetchSemaphore';

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

// ============================================================================
// OPTIMIZED CONFIGURATION - faster loading with reduced default layers
// ============================================================================
// Tile radii - keep under backend's 3500m cap
const MAX_STREET_TILE_RADIUS = 3500;
const MAX_BUILDING_TILE_RADIUS = 2000;

// Maximum tiles for full coverage - reduced for faster loading
const MAX_TILES_STREETS = 25;
const MAX_TILES_BUILDINGS = 49;

// Larger batch sizes for faster parallel fetching
const STREET_BATCH_SIZE = 25;
const BUILDING_BATCH_SIZE = 16;

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
  const runIdRef = useRef(0);

  // Single tile fetch with retry - wrapped in semaphore for global concurrency control
  // Now supports priority parameter for progressive loading
  const fetchTileWithRetry = useCallback(async (
    runId: number,
    tileLat: number,
    tileLng: number,
    tileRadius: number,
    skipService: boolean,
    fetchBuildings: boolean,
    buildingsOnly: boolean,
    priority: 0 | 1 | 2 = 0, // 0 = all, 1 = essential, 2 = details
    retries = 3
  ): Promise<TileResult | null> => {
    const cacheKey =
      getTileCacheKey(tileLat, tileLng, tileRadius) +
      (fetchBuildings ? (buildingsOnly ? '-bld-only' : '-bld') : '') +
      (priority > 0 ? `-p${priority}` : '');
    
    // Try IndexedDB cache first (24h TTL) - instant!
    const cached = await getCachedTile(cacheKey);
    if (cached) {
      return cached as TileResult;
    }
    
    // Use semaphore to limit concurrent requests globally
    return withConcurrencyLimit(async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        // If a new run started (user panned/changed params), stop doing work.
        if (runId !== runIdRef.current) return null;

        try {
          const { data, error: fnError } = await supabase.functions.invoke('fetch-streets', {
            body: {
              lat: tileLat,
              lng: tileLng,
              distance: tileRadius,
              skipService,
              includeBuildings: fetchBuildings,
              buildingsOnly,
              priority, // NEW: Send priority to backend
            },
          });

          if (fnError) {
            const errorStr = String(fnError.message || fnError);
            const isBootError = errorStr.includes('BOOT_ERROR') || errorStr.includes('503');
            const isWorkerLimit = errorStr.includes('WORKER_LIMIT') || errorStr.includes('546');
            
            if (attempt < retries) {
              const baseDelay = isWorkerLimit ? 600 : isBootError ? 400 : 150;
              const delay = baseDelay * Math.pow(1.5, attempt);
              console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms (in-flight: ${getCurrentInFlight()})`);
              await new Promise(r => setTimeout(r, delay));
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
          const errorStr = String(err);
          const isBootError = errorStr.includes('BOOT_ERROR') || errorStr.includes('503');
          const isWorkerLimit = errorStr.includes('WORKER_LIMIT') || errorStr.includes('546');
          
          if (attempt < retries) {
            const baseDelay = isWorkerLimit ? 600 : isBootError ? 400 : 150;
            const delay = baseDelay * Math.pow(1.5, attempt);
            console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms (exception)`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          console.error('Tile fetch exception:', err);
          return null;
        }
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const paramsKey = `${latitude.toFixed(4)}-${longitude.toFixed(4)}-${distance}-${includeBuildings}`;
    
    if (paramsKey === lastParamsRef.current) return;

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      const startTime = performance.now();
      setIsLoading(true);
      setError(null);

      // New run token: used to cancel in-flight loops when params change quickly.
      const runId = ++runIdRef.current;
      
      // Clean old cache entries periodically
      clearOldCache();

      try {
        // =========================================================================
        // ULTRA-FAST FIRST PAINT:
        // Before we even compute the full tile grid, fetch ONE small-radius center
        // request (priority=1). This massively improves perceived performance when
        // Overpass is slow for large bboxes.
        // =========================================================================
        const previewRadius = Math.min(1200, Math.max(600, Math.floor(distance * 0.35)));

        const previewFull = await fetchTileWithRetry(
          runId,
          latitude,
          longitude,
          previewRadius,
          /* skipService */ false,
          /* fetchBuildings */ false,
          /* buildingsOnly */ false,
          /* priority */ 0,
        );

        if (runId !== runIdRef.current) return;

        if (previewFull) {
          setStreets(previewFull.streets);
          setWater(previewFull.water);
          setCoastlines(previewFull.coastlines);
          console.log(`⚡ PREVIEW full (r=${previewRadius}m) in ${(performance.now() - startTime).toFixed(0)}ms`);
        }

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
        console.log(`🚀 FULL DETAIL LOAD: ${streetTiles.length} tiles`);

        // PHASE 1A: Center tile FULL detail for INSTANT feedback
        const centerTile = streetTiles[0];
        const centerFullResult = await fetchTileWithRetry(
          runId, centerTile.lat, centerTile.lng, centerTile.radius, skipService, false, false, 0
        );
        
        if (runId !== runIdRef.current) return;
        
        if (centerFullResult) {
          setStreets(centerFullResult.streets);
          setWater(centerFullResult.water);
          setCoastlines(centerFullResult.coastlines);
          setRailways(centerFullResult.railways);
          setAeroways(centerFullResult.aeroways);
          setParks(centerFullResult.parks);
          setForests(centerFullResult.forests);
          console.log(`⚡ CENTER full in ${(performance.now() - startTime).toFixed(0)}ms`);
        }

        // PHASE 1B: All tiles FULL detail in parallel
        const remainingTiles = streetTiles.slice(1);
        const fullResults: TileResult[] = centerFullResult ? [centerFullResult] : [];
        
        for (let i = 0; i < remainingTiles.length; i += STREET_BATCH_SIZE) {
          if (runId !== runIdRef.current) break;
          const batch = remainingTiles.slice(i, i + STREET_BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(tile =>
              fetchTileWithRetry(runId, tile.lat, tile.lng, tile.radius, skipService, false, false, 0)
            )
          );
          
          for (const result of batchResults) {
            if (result) fullResults.push(result);
          }
          
          // Progressive update
          const merged = mergeResults(fullResults);
          setStreets(merged.streets);
          setRailways(merged.railways);
          setAeroways(merged.aeroways);
          setWater(merged.water);
          setCoastlines(merged.coastlines);
          setParks(merged.parks);
          setForests(merged.forests);
        }
        
        const fullTime = performance.now() - startTime;
        console.log(`✅ FULL detail complete: ${fullResults.length} tiles in ${fullTime.toFixed(0)}ms`);

        const streetFetchPromise = Promise.resolve(fullResults);

        // PROGRESSIVE BUILDING FETCH: Update UI after each batch
        const buildingFetchPromise = (async () => {
          if (!includeBuildings) return [];
          const allResults: TileResult[] = [];
          
          for (let i = 0; i < buildingTiles.length; i += BUILDING_BATCH_SIZE) {
            if (runId !== runIdRef.current) break;
            const batch = buildingTiles.slice(i, i + BUILDING_BATCH_SIZE);
            const batchResults = await Promise.all(
              batch.map(tile =>
                fetchTileWithRetry(runId, tile.lat, tile.lng, tile.radius, skipService, true, true, 0)
              )
            );
            
            const validResults = batchResults.filter((r): r is TileResult => r !== null);
            allResults.push(...validResults);
            
            // Progressive update
            if (validResults.length > 0) {
              const progressiveMerge = mergeResults(allResults);
              setBuildings(progressiveMerge.buildings);
            }
          }
          
          return allResults;
        })();

        // Wait for both to complete simultaneously
        const [streetResults, buildingResults] = await Promise.all([
          streetFetchPromise,
          buildingFetchPromise
        ]);

        if (runId !== runIdRef.current) return;

        if (streetResults.length === 0) {
          setError('Failed to fetch street data');
          return;
        }

        // Final merge and state update
        const merged = mergeResults(streetResults);
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ COMPLETE: ${merged.streets.reduce((sum, s) => sum + s.coordinates.length, 0)} streets in ${totalTime.toFixed(0)}ms`);

        setStreets(merged.streets);
        setRailways(merged.railways);
        setAeroways(merged.aeroways);
        setCoastlines(merged.coastlines);
        setWater(merged.water);
        setParks(merged.parks);
        setForests(merged.forests);
        
        if (buildingResults.length > 0) {
          const finalBuildingMerge = mergeResults(buildingResults);
          console.log(`🏢 Buildings: ${finalBuildingMerge.buildings.length} from ${buildingResults.length} tiles`);
        }
        
        lastParamsRef.current = paramsKey;

      } catch (err) {
        console.error('Error fetching streets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, 30); // Reduced debounce for faster response

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [latitude, longitude, distance, enabled, includeBuildings, fetchTileWithRetry]);

  return { streets, railways, aeroways, coastlines, water, parks, forests, buildings, isLoading, error };
};
