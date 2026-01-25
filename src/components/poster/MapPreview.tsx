import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PosterTheme } from '@/types/poster';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  distance: number;
  theme: PosterTheme;
  onLocationChange?: (lat: number, lng: number) => void;
}

const MapController = ({ 
  latitude, 
  longitude, 
  distance,
  onLocationChange 
}: { 
  latitude: number; 
  longitude: number; 
  distance: number;
  onLocationChange?: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      map.setView([latitude, longitude], getZoomFromDistance(distance));
    } else {
      map.flyTo([latitude, longitude], getZoomFromDistance(distance), {
        duration: 1,
      });
    }
  }, [latitude, longitude, distance, map]);

  useEffect(() => {
    if (onLocationChange) {
      const handleMoveEnd = () => {
        const center = map.getCenter();
        onLocationChange(center.lat, center.lng);
      };
      map.on('moveend', handleMoveEnd);
      return () => {
        map.off('moveend', handleMoveEnd);
      };
    }
  }, [map, onLocationChange]);

  return null;
};

const getZoomFromDistance = (distance: number): number => {
  // Approximate zoom levels based on radius in meters
  if (distance <= 3000) return 14;
  if (distance <= 6000) return 13;
  if (distance <= 10000) return 12;
  if (distance <= 15000) return 11;
  if (distance <= 20000) return 10;
  return 9;
};

const getTileUrl = (theme: PosterTheme): string => {
  // Different map styles based on theme
  if (theme.id === 'noir') {
    return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  }
  if (theme.id === 'midnight') {
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
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border shadow-lg">
      <MapContainer
        center={[latitude, longitude]}
        zoom={getZoomFromDistance(distance)}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={getTileUrl(theme)}
        />
        <Circle
          center={[latitude, longitude]}
          radius={distance}
          pathOptions={{
            color: theme.text,
            fillColor: theme.text,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
        <MapController 
          latitude={latitude} 
          longitude={longitude} 
          distance={distance}
          onLocationChange={onLocationChange}
        />
      </MapContainer>
      
      {/* Overlay info */}
      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-mono text-foreground">
        {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
      </div>
    </div>
  );
};
