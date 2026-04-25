/**
 * useStreetData Hook - PMTiles Edition
 *
 * Fetches map data from pre-processed vector tiles on Cloudflare R2.
 * Always fetches ALL layers from tiles (they're cached anyway), and
 * filters on the client side when setting state. This makes layer
 * toggling instant — no re-fetching needed.
 */

import { useState, useEffect, useRef } from 'react';
import { fetchMapData, PMTilesFetchResult } from '@/lib/pmtilesSource';

export interface StreetSegment {
  type: 'motorway' | 'primary' | 'secondary' | 'tertiary' | 'residential' | 'service' | 'path';
  coordinates: [number, number][][];
}

interface LayerVisibility {
  water?: boolean;
  forests?: boolean;
  parks?: boolean;
  railways?: boolean;
  aeroways?: boolean;
  coastlines?: boolean;
  buildings?: boolean;
  sideStreets?: boolean;
  footpaths?: boolean;
  cycleways?: boolean;
  paths?: boolean;
  mainRoads?: boolean;
  trainStations?: boolean;
  cableways?: boolean;
  residentialBuildings?: boolean;
  commercialBuildings?: boolean;
  lakes?: boolean;
  rivers?: boolean;
  monuments?: boolean;
  stadiums?: boolean;
}

interface UseStreetDataProps {
  latitude: number;
  longitude: number;
  distance: number;
  enabled?: boolean;
  includeBuildings?: boolean;
  layerVisibility?: LayerVisibility;
  qualityMode?: 'preview' | 'fullscreen';
  cityName?: string;
  countryName?: string;
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
  trainStations: [number, number][];
  cableways: [number, number][][];
  lakes: [number, number][][];
  rivers: [number, number][][];
  monuments: [number, number][];
  stadiums: [number, number][][];
  isLoading: boolean;
  error: string | null;
}

// Store latest full result so layer toggles can re-filter without refetching
let cachedResult: PMTilesFetchResult | null = null;
let cachedGeoKey = '';

/** Discard the in-memory module cache (called after IDB version bump / corruption detected). */
function invalidateModuleCache() {
  cachedResult = null;
  cachedGeoKey = '';
}

export const useStreetData = ({
  latitude,
  longitude,
  distance,
  enabled = true,
  includeBuildings = false,
  layerVisibility,
  qualityMode = 'preview',
  cityName,
  countryName,
}: UseStreetDataProps): UseStreetDataResult => {
  const [streets, setStreets] = useState<StreetSegment[]>([]);
  const [railways, setRailways] = useState<[number, number][][]>([]);
  const [aeroways, setAeroways] = useState<[number, number][][]>([]);
  const [coastlines, setCoastlines] = useState<[number, number][][]>([]);
  const [water, setWater] = useState<[number, number][][]>([]);
  const [parks, setParks] = useState<[number, number][][]>([]);
  const [forests, setForests] = useState<[number, number][][]>([]);
  const [buildings, setBuildings] = useState<[number, number][][]>([]);
  const [trainStations, setTrainStations] = useState<[number, number][]>([]);
  const [cableways, setCableways] = useState<[number, number][][]>([]);
  const [lakes, setLakes] = useState<[number, number][][]>([]);
  const [rivers, setRivers] = useState<[number, number][][]>([]);
  const [monuments, setMonuments] = useState<[number, number][]>([]);
  const [stadiums, setStadiums] = useState<[number, number][][]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const runIdRef = useRef(0);
  // Counts active in-flight fetches so isLoading clears only when all complete
  const pendingFetchesRef = useRef(0);

  const lv = layerVisibility;
  const wantBuildings = includeBuildings || !!(lv?.buildings) || !!(lv?.residentialBuildings) || !!(lv?.commercialBuildings);

  // Apply layer visibility filters to a full result
  const applyFilters = (result: PMTilesFetchResult) => {
    const typedStreets: StreetSegment[] = result.streets.map((s) => ({
      type: s.type as StreetSegment['type'],
      coordinates: s.coordinates,
    }));

    setStreets(typedStreets);
    setRailways(lv?.railways !== false ? result.railways : []);
    setAeroways(lv?.aeroways !== false ? result.aeroways : []);
    setCoastlines(lv?.coastlines ? result.coastlines : []);
    setWater(lv?.water !== false ? result.water : []);
    setParks(lv?.parks ? result.parks : []);
    setForests(lv?.forests ? result.forests : []);
    setBuildings(wantBuildings ? result.buildings : []);
    setTrainStations(lv?.trainStations ? result.trainStations : []);
    setCableways(result.cableways);
    setLakes(lv?.lakes ? result.lakes : []);
    setRivers(lv?.rivers ? result.rivers : []);
    setMonuments(result.monuments);
    setStadiums(result.stadiums);
  };

  // Geo key: only changes when location or distance changes significantly (not layer toggles)
  // Round distance to nearest 2000m to avoid re-fetching on every zoom step
  // Round coords to 2 decimal places (~1.1km) to avoid refetch on small pans
  const roundedDist = Math.round(distance / 2000) * 2000 || 2000;
  // Quality is part of the key — preview uses simplified geometry, fullscreen full detail.
  const geoKey = `${latitude.toFixed(2)}-${longitude.toFixed(2)}-${roundedDist}-b${wantBuildings ? 1 : 0}-q${qualityMode === 'fullscreen' ? 'f' : 'p'}`;

  // When only layer visibility changes (same geo key), re-filter from cache instantly
  useEffect(() => {
    if (!enabled || !cachedResult || cachedGeoKey !== geoKey) return;
    applyFilters(cachedResult);
  }, [lv?.water, lv?.railways, lv?.parks, lv?.forests, lv?.coastlines, lv?.aeroways,
      lv?.lakes, lv?.rivers, lv?.trainStations, lv?.buildings, lv?.residentialBuildings,
      lv?.commercialBuildings, wantBuildings]);

  // When geo changes, fetch new tiles
  useEffect(() => {
    if (!enabled) return;
    if (geoKey === cachedGeoKey && cachedResult) {
      // Validate module cache — discard if it has no streets (stale/corrupt)
      const streetCount = cachedResult.streets.reduce((sum, s) => sum + s.coordinates.length, 0);
      if (streetCount >= 5) {
        applyFilters(cachedResult);
        return;
      }
      invalidateModuleCache();
    }

    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    // No debounce on first load (geoKey just changed), only debounce rapid changes
    const debounceMs = cachedResult ? 60 : 0;
    fetchTimeoutRef.current = setTimeout(async () => {
      const startTime = performance.now();
      pendingFetchesRef.current++;
      setIsLoading(true);
      setError(null);

      const runId = ++runIdRef.current;

      try {
        console.log(`[useStreetData] Fetching via PMTiles: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) r=${roundedDist}m`);

        // Fetch layers — only fetch buildings when explicitly enabled (saves 50+ tile fetches)
        // Progressive callback shows partial map data as tiles arrive
        const onProgress = (partial: PMTilesFetchResult) => {
          if (runId !== runIdRef.current) return;
          applyFilters(partial);
        };

        const result: PMTilesFetchResult = await fetchMapData(
          latitude, longitude, roundedDist,
          {
            water: true,
            forests: true,
            parks: true,
            railways: true,
            aeroways: true,
            coastlines: true,
            buildings: wantBuildings,
            lakes: true,
            rivers: true,
          },
          onProgress,
          { quality: qualityMode, city: cityName, country: countryName },
        );

        if (runId !== runIdRef.current) return;

        // Cache full result
        cachedResult = result;
        cachedGeoKey = geoKey;

        // Apply final layer filters
        applyFilters(result);

        const elapsed = performance.now() - startTime;
        const streetCount = result.streets.reduce((sum, s) => sum + s.coordinates.length, 0);
        console.log(`[useStreetData] Complete: ${streetCount} streets in ${elapsed.toFixed(0)}ms`);

      } catch (err) {
        if (runId !== runIdRef.current) return;
        console.error('[useStreetData] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch map data');
      } finally {
        if (--pendingFetchesRef.current === 0) setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [geoKey, enabled]);

  return {
    streets, railways, aeroways, coastlines, water, parks, forests, buildings,
    trainStations, cableways, lakes, rivers, monuments, stadiums,
    isLoading, error,
  };
};
