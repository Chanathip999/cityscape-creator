import { useState } from 'react';
import { MapRoute } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Route, MapPin, Navigation, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RouteEditorProps {
  routes: MapRoute[];
  onRoutesChange: (routes: MapRoute[]) => void;
}

export const RouteEditor = ({ routes, onRoutesChange }: RouteEditorProps) => {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [routeColor, setRouteColor] = useState('#E53935');
  const [isLoading, setIsLoading] = useState(false);

  // Geocode an address using geonames-search
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('geonames-search', {
        body: { query: address, maxRows: 1 },
      });

      if (error) throw error;

      if (data?.geonames && data.geonames.length > 0) {
        return {
          lat: parseFloat(data.geonames[0].lat),
          lng: parseFloat(data.geonames[0].lng),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Fetch route from OSRM
  const fetchRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<[number, number][]> => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        // OSRM returns [lng, lat], we need [lat, lng]
        return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
      }
      return [];
    } catch (error) {
      console.error('Routing error:', error);
      return [];
    }
  };

  const addRoute = async () => {
    if (!startAddress.trim() || !endAddress.trim()) {
      toast.error('Bitte beide Adressen eingeben');
      return;
    }

    setIsLoading(true);
    try {
      // Geocode both addresses
      const [startCoords, endCoords] = await Promise.all([
        geocodeAddress(startAddress),
        geocodeAddress(endAddress),
      ]);

      if (!startCoords) {
        toast.error(`Adresse nicht gefunden: ${startAddress}`);
        return;
      }
      if (!endCoords) {
        toast.error(`Adresse nicht gefunden: ${endAddress}`);
        return;
      }

      // Fetch route geometry
      const routePoints = await fetchRoute(
        startCoords.lat,
        startCoords.lng,
        endCoords.lat,
        endCoords.lng
      );

      const newRoute: MapRoute = {
        id: `route-${Date.now()}`,
        startAddress,
        endAddress,
        startLat: startCoords.lat,
        startLng: startCoords.lng,
        endLat: endCoords.lat,
        endLng: endCoords.lng,
        color: routeColor,
        width: 1,
        routePoints: routePoints.length > 0 ? routePoints : undefined,
      };

      onRoutesChange([...routes, newRoute]);
      setStartAddress('');
      setEndAddress('');
      toast.success('Route hinzugefügt');
    } catch (error) {
      console.error('Error adding route:', error);
      toast.error('Fehler beim Erstellen der Route');
    } finally {
      setIsLoading(false);
    }
  };

  const removeRoute = (id: string) => {
    onRoutesChange(routes.filter(route => route.id !== id));
  };

  const updateRouteColor = (id: string, color: string) => {
    onRoutesChange(routes.map(route => 
      route.id === id ? { ...route, color } : route
    ));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Route className="w-4 h-4" />
        Routen zeichnen
      </Label>

      {/* Route input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <Input
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            placeholder="Startadresse (z.B. Brandenburger Tor, Berlin)"
            className="h-9 text-sm"
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-destructive flex-shrink-0" />
          <Input
            value={endAddress}
            onChange={(e) => setEndAddress(e.target.value)}
            placeholder="Zieladresse (z.B. Alexanderplatz, Berlin)"
            className="h-9 text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Color and add button */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={routeColor}
          onChange={(e) => setRouteColor(e.target.value)}
          className="w-8 h-8 rounded border border-border cursor-pointer"
        />
        <span className="text-xs text-muted-foreground flex-1">Routenfarbe</span>
        <Button 
          onClick={addRoute} 
          disabled={isLoading || !startAddress || !endAddress}
          size="sm" 
          className="gap-1"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Route hinzufügen
            </>
          )}
        </Button>
      </div>

      {/* Active routes list */}
      {routes.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Aktive Routen ({routes.length})</Label>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {routes.map((route) => (
              <div
                key={route.id}
                className="flex items-center gap-2 py-2 px-2 rounded bg-muted/50"
              >
                <input
                  type="color"
                  value={route.color}
                  onChange={(e) => updateRouteColor(route.id, e.target.value)}
                  className="w-6 h-6 rounded border border-border cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{route.startAddress}</div>
                  <div className="text-[10px] text-muted-foreground truncate">→ {route.endAddress}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRoute(route.id)}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Die Route wird automatisch zwischen den Adressen berechnet.
      </p>
    </div>
  );
};
