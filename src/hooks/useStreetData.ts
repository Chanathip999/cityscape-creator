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

// Maximum radius per tile request to stay within edge function memory limits
const MAX_TILE_RADIUS = 8000; // 8km per tile for safety margin

// Calculate tiles needed for a given area - prioritizes center coverage
function calculateTiles(lat: number, lng: number, distance: number): { lat: number; lng: number; radius: number }[] {
  // For small areas, single tile is enough
  if (distance <= MAX_TILE_RADIUS) {
    return [{ lat, lng, radius: distance }];
  }

  const tiles: { lat: number; lng: number; radius: number }[] = [];
  
  // Always start with center tile
  tiles.push({ lat, lng, radius: MAX_TILE_RADIUS });

  // Calculate how many tiles we need to cover the full area
  // Each tile covers 2*radius, with some overlap for seamless coverage
  const tileSpacing = MAX_TILE_RADIUS * 1.5; // 75% of diameter = 25% overlap
  const numTilesPerSide = Math.ceil(distance / tileSpacing);
  
  if (numTilesPerSide <= 1) {
    return tiles; // Center tile is enough
  }

  // Calculate offset in degrees
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  const latStep = tileSpacing / metersPerDegreeLat;
  const lngStep = tileSpacing / metersPerDegreeLng;

  // Add tiles in concentric rings around center
  for (let ring = 1; ring <= numTilesPerSide; ring++) {
    // Top and bottom rows of this ring
    for (let col = -ring; col <= ring; col++) {
      tiles.push({ lat: lat + ring * latStep, lng: lng + col * lngStep, radius: MAX_TILE_RADIUS });
      tiles.push({ lat: lat - ring * latStep, lng: lng + col * lngStep, radius: MAX_TILE_RADIUS });
    }
    // Left and right columns (excluding corners already added)
    for (let row = -ring + 1; row <= ring - 1; row++) {
      tiles.push({ lat: lat + row * latStep, lng: lng + ring * lngStep, radius: MAX_TILE_RADIUS });
      tiles.push({ lat: lat + row * latStep, lng: lng - ring * lngStep, radius: MAX_TILE_RADIUS });
    }
  }

  console.log(`Created ${tiles.length} tiles for ${distance}m radius (center + ${numTilesPerSide} rings)`);
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
    tileRadius: number
  ): Promise<TileResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-streets', {
        body: { lat: tileLat, lng: tileLng, distance: tileRadius },
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
        console.log(`Fetching ${tiles.length} tile(s) for area`);

        // Fetch all tiles in parallel (but limit concurrency to avoid overwhelming the API)
        const BATCH_SIZE = 4;
        const results: TileResult[] = [];

        for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
          const batch = tiles.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(tile => fetchTile(tile.lat, tile.lng, tile.radius))
          );
          
          for (const result of batchResults) {
            if (result) results.push(result);
          }

          // Small delay between batches to be nice to the API
          if (i + BATCH_SIZE < tiles.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
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
