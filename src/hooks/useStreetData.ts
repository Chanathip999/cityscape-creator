import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StreetSegment {
  type: 'motorway' | 'primary' | 'secondary' | 'tertiary' | 'residential' | 'service';
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
  water: [number, number][][];
  parks: [number, number][][];
  isLoading: boolean;
  error: string | null;
}

interface TileResult {
  streets: StreetSegment[];
  railways: [number, number][][];
  water: [number, number][][];
  parks: [number, number][][];
}

// Maximum radius per tile - use 5km for efficiency
const MAX_TILE_RADIUS = 5000;

// Maximum tiles to prevent excessive requests
const MAX_TILES = 25;

// Calculate tiles needed for a given area - prioritizes center coverage
function calculateTiles(lat: number, lng: number, distance: number): { lat: number; lng: number; radius: number }[] {
  // For small areas, single tile is enough
  if (distance <= MAX_TILE_RADIUS) {
    return [{ lat, lng, radius: distance }];
  }

  const tiles: { lat: number; lng: number; radius: number }[] = [];
  
  // Always start with center tile
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

  // Add tiles in concentric rings around center
  for (let ring = 1; ring <= numTilesPerSide && tiles.length < MAX_TILES; ring++) {
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

  console.log(`Created ${tiles.length} tiles for ${distance}m radius (capped at ${MAX_TILES})`);
  return tiles;
}

// Merge multiple tile results, deduplicating where possible
function mergeResults(results: TileResult[]): TileResult {
  const merged: TileResult = {
    streets: [],
    railways: [],
    water: [],
    parks: [],
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
    merged.water.push(...result.water);
    merged.parks.push(...result.parks);
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
  const [water, setWater] = useState<[number, number][][]>([]);
  const [parks, setParks] = useState<[number, number][][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastParamsRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTile = useCallback(async (
    tileLat: number,
    tileLng: number,
    tileRadius: number,
    skipService: boolean
  ): Promise<TileResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-streets', {
        body: { lat: tileLat, lng: tileLng, distance: tileRadius, skipService },
      });

      if (fnError) {
        console.error('Tile fetch error:', fnError);
        return null;
      }

      return {
        streets: data?.streets || [],
        railways: data?.railways || [],
        water: data?.water || [],
        parks: data?.parks || [],
      };
    } catch (err) {
      console.error('Tile fetch exception:', err);
      return null;
    }
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

      abortControllerRef.current = new AbortController();

      try {
        const tiles = calculateTiles(latitude, longitude, distance);
        
        // Skip service roads for large areas (>8km) - they're 60% of data volume
        const skipService = distance > 8000;
        console.log(`Fetching ${tiles.length} tile(s) for area (skipService: ${skipService})`);

        // Fetch tiles in small batches to avoid compute spikes
        const BATCH_SIZE = 3;
        const results: TileResult[] = [];

        for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
          const batch = tiles.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(tile => fetchTile(tile.lat, tile.lng, tile.radius, skipService))
          );
          
          for (const result of batchResults) {
            if (result) results.push(result);
          }

          // Small delay between batches
          if (i + BATCH_SIZE < tiles.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
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
        setWater(merged.water);
        setParks(merged.parks);
        lastParamsRef.current = paramsKey;

      } catch (err) {
        console.error('Error fetching streets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [latitude, longitude, distance, enabled, fetchTile]);

  return { streets, railways, water, parks, isLoading, error };
};
