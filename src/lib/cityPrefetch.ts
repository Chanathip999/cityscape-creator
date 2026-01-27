/**
 * City Prefetch System
 * Pre-fetches map data for popular cities in the background
 * to provide instant loading when users select them.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCachedTile, setCachedTile, getTileCacheKey } from './streetDataCache';
import { withConcurrencyLimit, getCurrentInFlight } from './fetchSemaphore';

// Top 20 most popular cities for map posters
// Coordinates are city centers; we prefetch a 4km radius
export const POPULAR_CITIES = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { name: 'Vienna', lat: 48.2082, lng: 16.3738 },
  { name: 'Prague', lat: 50.0755, lng: 14.4378 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Munich', lat: 48.1351, lng: 11.5820 },
  { name: 'Milan', lat: 45.4642, lng: 9.1900 },
  { name: 'Lisbon', lat: 38.7223, lng: -9.1393 },
];

// Prefetch radius in meters - matches common poster sizes
const PREFETCH_RADIUS = 4000;

// Track prefetch status
let prefetchStarted = false;
let prefetchedCities: string[] = [];

interface PrefetchResult {
  city: string;
  success: boolean;
  fromCache: boolean;
}

/**
 * Prefetch a single city's map data
 */
async function prefetchCity(city: typeof POPULAR_CITIES[0]): Promise<PrefetchResult> {
  const cacheKey = getTileCacheKey(city.lat, city.lng, PREFETCH_RADIUS) + '-prefetch';
  
  // Check if already cached
  const cached = await getCachedTile(cacheKey);
  if (cached) {
    return { city: city.name, success: true, fromCache: true };
  }

  try {
    // IMPORTANT: Prefetch must be "low impact".
    // - Use the global semaphore so prefetch never competes aggressively with interactive loads.
    // - Avoid priority=2 because that loads minor roads/paths (largest payload).
    const { data, error } = await withConcurrencyLimit(async () =>
      supabase.functions.invoke('fetch-streets', {
        body: {
          lat: city.lat,
          lng: city.lng,
          distance: PREFETCH_RADIUS,
          // Reduced payload while still useful for quick first paint
          skipService: true,
          includeBuildings: false,
          buildingsOnly: false,
          priority: 0,
          layerVisibility: {
            water: true,
            railways: true,
            aeroways: true,
            forests: false,
            parks: false,
            coastlines: false,
            buildings: false,
          },
        },
      })
    );

    if (error) {
      console.warn(
        `[prefetch] Failed to prefetch ${city.name} (in-flight: ${getCurrentInFlight()}):`,
        error
      );
      return { city: city.name, success: false, fromCache: false };
    }

    // Cache the result
    await setCachedTile(cacheKey, data);
    
    // Also cache with standard key format for better hit rates
    const standardKey = getTileCacheKey(city.lat, city.lng, PREFETCH_RADIUS);
    await setCachedTile(standardKey, data);

    return { city: city.name, success: true, fromCache: false };
  } catch (err) {
    console.warn(`[prefetch] Exception prefetching ${city.name}:`, err);
    return { city: city.name, success: false, fromCache: false };
  }
}

/**
 * Start background prefetching of popular cities
 * Called once on app initialization
 * Uses low priority and rate limiting to avoid impacting user experience
 */
export async function startCityPrefetch(): Promise<void> {
  if (prefetchStarted) {
    console.log('[prefetch] Already started, skipping');
    return;
  }
  
  prefetchStarted = true;
  console.log('[prefetch] Starting background prefetch for', POPULAR_CITIES.length, 'cities');

  // Wait a bit before starting to let the initial page load complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Prefetch cities one by one with delays to avoid overwhelming the API
  for (const city of POPULAR_CITIES) {
    // Check if already prefetched in this session
    if (prefetchedCities.includes(city.name)) continue;

    const result = await prefetchCity(city);
    
    if (result.success) {
      prefetchedCities.push(city.name);
      console.log(`[prefetch] ✓ ${city.name} ${result.fromCache ? '(cached)' : '(fetched)'}`);
    }

    // Wait between cities to avoid rate limiting + reduce compute pressure.
    // Add small jitter so multiple clients don't align perfectly.
    const jitter = Math.floor(Math.random() * 500);
    await new Promise(resolve => setTimeout(resolve, 3500 + jitter));
  }

  console.log('[prefetch] Complete:', prefetchedCities.length, 'cities prefetched');
}

/**
 * Check if a city is in the popular list (for instant loading indication)
 */
export function isPopularCity(lat: number, lng: number, tolerance = 0.05): boolean {
  return POPULAR_CITIES.some(
    city => Math.abs(city.lat - lat) < tolerance && Math.abs(city.lng - lng) < tolerance
  );
}

/**
 * Get prefetch status
 */
export function getPrefetchStatus(): { started: boolean; citiesPrefetched: string[] } {
  return {
    started: prefetchStarted,
    citiesPrefetched: [...prefetchedCities],
  };
}

/**
 * Prefetch a specific location (for user's last viewed city)
 */
export async function prefetchLocation(lat: number, lng: number, radius = PREFETCH_RADIUS): Promise<boolean> {
  const cacheKey = getTileCacheKey(lat, lng, radius);
  
  // Check if already cached
  const cached = await getCachedTile(cacheKey);
  if (cached) return true;

  try {
    const { data, error } = await withConcurrencyLimit(async () =>
      supabase.functions.invoke('fetch-streets', {
        body: {
          lat,
          lng,
          distance: radius,
          skipService: true,
          includeBuildings: false,
          buildingsOnly: false,
          priority: 0,
          layerVisibility: {
            water: true,
            railways: true,
            aeroways: true,
            forests: false,
            parks: false,
            coastlines: false,
            buildings: false,
          },
        },
      })
    );

    if (!error && data) {
      await setCachedTile(cacheKey, data);
      return true;
    }
  } catch {
    // Silently fail prefetch
  }
  
  return false;
}
