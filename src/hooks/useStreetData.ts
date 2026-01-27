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
}

interface UseStreetDataResult {
  streets: StreetSegment[];
  railways: [number, number][][];
  aeroways: [number, number][][];
  coastlines: [number, number][][];
  water: [number, number][][];
  parks: [number, number][][];
  forests: [number, number][][];
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
}

// Maximum radius per tile - use 5km for efficiency
const MAX_TILE_RADIUS = 5000;

// Maximum tiles to prevent excessive requests
const MAX_TILES = 25;

// Calculate tiles needed for a given area - ensures center is always included
function calculateTiles(lat: number, lng: number, distance: number): { lat: number; lng: number; radius: number }[] {
  // For small areas, single tile is enough
  if (distance <= MAX_TILE_RADIUS) {
    return [{ lat, lng, radius: distance }];
  }

  const tiles: { lat: number; lng: number; radius: number }[] = [];
  
  // CRITICAL: Always start with exact center tile at the user's coordinates
  tiles.push({ lat, lng, radius: MAX_TILE_RADIUS });

  // Tile spacing with overlap for seamless coverage
  const tileSpacing = MAX_TILE_RADIUS * 1.6;
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
    if (tiles.length < MAX_TILES) {
      tiles.push({ lat: lat + offset.dLat, lng: lng + offset.dLng, radius: MAX_TILE_RADIUS });
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
    if (tiles.length < MAX_TILES) {
      tiles.push({ lat: lat + offset.dLat, lng: lng + offset.dLng, radius: MAX_TILE_RADIUS });
    }
  }

  // Add outer ring tiles for larger areas
  for (let ring = 2; ring <= numTilesPerSide && tiles.length < MAX_TILES; ring++) {
    // Top and bottom rows of this ring
    for (let col = -ring; col <= ring && tiles.length < MAX_TILES; col++) {
      tiles.push({ lat: lat + ring * latStep, lng: lng + col * lngStep, radius: MAX_TILE_RADIUS });
      if (tiles.length < MAX_TILES) {
        tiles.push({ lat: lat - ring * latStep, lng: lng + col * lngStep, radius: MAX_TILE_RADIUS });
      }
    }
    // Left and right columns (excluding corners already added)
    for (let row = -ring + 1; row <= ring - 1 && tiles.length < MAX_TILES; row++) {
      tiles.push({ lat: lat + row * latStep, lng: lng + ring * lngStep, radius: MAX_TILE_RADIUS });
      if (tiles.length < MAX_TILES) {
        tiles.push({ lat: lat + row * latStep, lng: lng - ring * lngStep, radius: MAX_TILE_RADIUS });
      }
    }
  }

  console.log(`Created ${tiles.length} tiles for ${distance}m radius (center: ${lat.toFixed(3)}, ${lng.toFixed(3)})`);
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
}: UseStreetDataProps): UseStreetDataResult => {
  const [streets, setStreets] = useState<StreetSegment[]>([]);
  const [railways, setRailways] = useState<[number, number][][]>([]);
  const [aeroways, setAeroways] = useState<[number, number][][]>([]);
  const [coastlines, setCoastlines] = useState<[number, number][][]>([]);
  const [water, setWater] = useState<[number, number][][]>([]);
  const [parks, setParks] = useState<[number, number][][]>([]);
  const [forests, setForests] = useState<[number, number][][]>([]);
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
    retries = 2
  ): Promise<TileResult | null> => {
    const cacheKey = getTileCacheKey(tileLat, tileLng, tileRadius);
    
    // Try IndexedDB cache first (24h TTL) - instant!
    const cached = await getCachedTile(cacheKey);
    if (cached) {
      return cached as TileResult;
    }
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('fetch-streets', {
          body: { lat: tileLat, lng: tileLng, distance: tileRadius, skipService },
        });

        if (fnError) {
          if (attempt < retries) {
            // Wait before retry with exponential backoff
            await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
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
        };
        
        // Cache in IndexedDB for future use
        await setCachedTile(cacheKey, result);
        
        return result;
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
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

    const paramsKey = `${latitude.toFixed(4)}-${longitude.toFixed(4)}-${distance}`;
    
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
        const tiles = calculateTiles(latitude, longitude, distance);
        
        // Always fetch all street types including service for maximum detail
        // The tile-based approach handles this efficiently
        const skipService = false;
        console.log(`Fetching ${tiles.length} tile(s) for area (skipService: ${skipService})`);

        // Smart batching: fetch in small concurrent batches to avoid rate limiting
        // while still being much faster than sequential
        const BATCH_SIZE = 5;
        const results: TileResult[] = [];
        
        for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
          const batch = tiles.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(tile => fetchTileWithRetry(tile.lat, tile.lng, tile.radius, skipService))
          );
          
          for (const result of batchResults) {
            if (result) results.push(result);
          }
        }

        if (results.length === 0) {
          setError('Failed to fetch street data');
          return;
        }

        // Merge all tile results
        const merged = mergeResults(results);

        console.log('Merged street data:', merged.streets.map(s => ({
          type: s.type,
          count: s.coordinates.length,
        })));

        setStreets(merged.streets);
        setRailways(merged.railways);
        setAeroways(merged.aeroways);
        setCoastlines(merged.coastlines);
        setWater(merged.water);
        setParks(merged.parks);
        setForests(merged.forests);
        lastParamsRef.current = paramsKey;

      } catch (err) {
        console.error('Error fetching streets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, 200); // Reduced debounce for faster response

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [latitude, longitude, distance, enabled, fetchTileWithRetry]);

  return { streets, railways, aeroways, coastlines, water, parks, forests, isLoading, error };
};
