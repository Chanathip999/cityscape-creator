import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StreetSegment {
  type: 'motorway' | 'primary' | 'secondary' | 'tertiary' | 'residential';
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
  isLoading: boolean;
  error: string | null;
}

export const useStreetData = ({
  latitude,
  longitude,
  distance,
  enabled = true,
}: UseStreetDataProps): UseStreetDataResult => {
  const [streets, setStreets] = useState<StreetSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track last fetch to debounce
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastParamsRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    const paramsKey = `${latitude.toFixed(4)}-${longitude.toFixed(4)}-${distance}`;
    
    // Skip if same params
    if (paramsKey === lastParamsRef.current) return;

    // Debounce fetches
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching street data for:', { latitude, longitude, distance });
        
        const { data, error: fnError } = await supabase.functions.invoke('fetch-streets', {
          body: { lat: latitude, lng: longitude, distance },
        });

        if (fnError) {
          console.error('Edge function error:', fnError);
          setError(fnError.message || 'Failed to fetch street data');
          return;
        }

        if (data?.streets) {
          console.log('Received street data:', data.streets.map((s: StreetSegment) => ({
            type: s.type,
            count: s.coordinates.length,
          })));
          setStreets(data.streets);
          lastParamsRef.current = paramsKey;
        }
      } catch (err) {
        console.error('Error fetching streets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [latitude, longitude, distance, enabled]);

  return { streets, isLoading, error };
};
