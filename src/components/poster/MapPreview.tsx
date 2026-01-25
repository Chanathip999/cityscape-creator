import { useEffect, useRef, useState } from 'react';
import { PosterTheme } from '@/types/poster';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  distance: number;
  theme: PosterTheme;
  onLocationChange?: (lat: number, lng: number) => void;
}

const getZoomFromDistance = (distance: number): number => {
  if (distance <= 3000) return 14;
  if (distance <= 6000) return 13;
  if (distance <= 10000) return 12;
  if (distance <= 15000) return 11;
  if (distance <= 20000) return 10;
  return 9;
};

const getTileUrl = (theme: PosterTheme): string => {
  if (theme.id === 'noir' || theme.id === 'midnight') {
    return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  }
  return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
};

export const MapPreview = ({ 
  latitude, 
  longitude, 
  distance, 
  theme,
  onLocationChange 
}: MapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || leafletMapRef.current) return;

      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: getZoomFromDistance(distance),
        zoomControl: true,
        scrollWheelZoom: true,
      });

      tileLayerRef.current = L.tileLayer(getTileUrl(theme), {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      circleRef.current = L.circle([latitude, longitude], {
        radius: distance,
        color: theme.text,
        fillColor: theme.text,
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);

      if (onLocationChange) {
        map.on('moveend', () => {
          const center = map.getCenter();
          onLocationChange(center.lat, center.lng);
        });
      }

      leafletMapRef.current = map;
      setIsLoaded(true);
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        tileLayerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // Update position
  useEffect(() => {
    if (!leafletMapRef.current || !isLoaded) return;
    
    leafletMapRef.current.flyTo([latitude, longitude], getZoomFromDistance(distance), {
      duration: 1,
    });

    if (circleRef.current) {
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setRadius(distance);
    }
  }, [latitude, longitude, distance, isLoaded]);

  // Update theme
  useEffect(() => {
    if (!leafletMapRef.current || !tileLayerRef.current || !circleRef.current || !isLoaded) return;
    
    const L = (window as any).L;
    if (!L) return;

    leafletMapRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(getTileUrl(theme), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(leafletMapRef.current);

    circleRef.current.setStyle({
      color: theme.text,
      fillColor: theme.text,
    });
  }, [theme, isLoaded]);

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Overlay info */}
      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-mono text-foreground z-[1000]">
        {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
      </div>
    </div>
  );
};
