import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface CitySearchProps {
  onCitySelect: (city: string, country: string, lat: number, lon: number) => void;
}

interface GeoNamesCity {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  population: number;
  region: string;
  displayName: string;
}

export const CitySearch = ({ onCitySelect }: CitySearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoNamesCity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchCity = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geonames-search', {
        body: { query: query.trim() },
      });

      if (error) {
        console.error('GeoNames search error:', error);
        return;
      }

      if (data?.results) {
        setResults(data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleSelect = (result: GeoNamesCity) => {
    onCitySelect(result.name, result.country, result.lat, result.lng);
    setShowResults(false);
    setQuery(result.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCity();
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Stadtsuche</label>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stadt suchen..."
              className="pl-9"
            />
          </div>
          <Button 
            onClick={searchCity} 
            disabled={isLoading || query.trim().length < 2}
            size="icon"
            variant="secondary"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              {results.map((result, index) => (
                <button
                  key={`${result.name}-${result.lat}-${index}`}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3 border-b border-border last:border-0"
                >
                  <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {result.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.region ? `${result.region}, ` : ''}{result.country}
                    </span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
