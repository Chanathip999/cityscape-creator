import { useEffect, useRef, useState } from 'react';
import { PosterConfig } from '@/types/poster';

interface PosterPreviewProps {
  config: PosterConfig;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

const formatCoordinates = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir} / ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
};

const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join(' ');
};

const getZoomFromDistance = (distance: number): number => {
  if (distance <= 3000) return 14;
  if (distance <= 6000) return 13;
  if (distance <= 10000) return 12;
  if (distance <= 15000) return 11;
  if (distance <= 20000) return 10;
  return 9;
};

const getTileUrl = (themeId: string): string => {
  if (themeId === 'noir' || themeId === 'midnight') {
    return 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
  }
  return 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
};

export const PosterPreview = ({ config, onLocationChange, interactive = false }: PosterPreviewProps) => {
  const { city, country, countryLabel, latitude, longitude, distance, theme, fontFamily, fontSize, orientation } = config;
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Get font family class
  const getFontClass = () => {
    switch (fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'sans':
        return 'font-sans';
      default:
        return 'font-mono';
    }
  };

  // Get font size multiplier
  const getFontSize = () => {
    switch (fontSize) {
      case 'small':
        return { title: 'text-xl md:text-2xl', subtitle: 'text-[10px]', coords: 'text-[8px]' };
      case 'large':
        return { title: 'text-3xl md:text-4xl lg:text-5xl', subtitle: 'text-sm', coords: 'text-xs' };
      default:
        return { title: 'text-2xl md:text-3xl lg:text-4xl', subtitle: 'text-xs md:text-sm', coords: 'text-xs' };
    }
  };

  const fontSizes = getFontSize();
  
  // Aspect ratio based on orientation
  const aspectRatio = orientation === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]';

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      // Clean up existing map
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const L = await import('leaflet');
      
      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: getZoomFromDistance(distance),
        zoomControl: false,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
        attributionControl: false,
      });

      tileLayerRef.current = L.tileLayer(getTileUrl(theme.id), {
        attribution: '',
      }).addTo(map);

      // Add move listener if interactive
      if (interactive && onLocationChange) {
        map.on('moveend', () => {
          const center = map.getCenter();
          onLocationChange(center.lat, center.lng);
        });
      }

      leafletMapRef.current = map;
      
      // Force map to recalculate size after initialization
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
          setIsMapReady(true);
        }
      }, 100);
      
      // Additional invalidation for slow renders
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 500);
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [interactive]);

  // Update map when config changes
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady) return;
    
    leafletMapRef.current.setView([latitude, longitude], getZoomFromDistance(distance), {
      animate: true,
      duration: 0.5,
    });
  }, [latitude, longitude, distance, isMapReady]);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!leafletMapRef.current || !tileLayerRef.current || !isMapReady) return;
    
    const L = (window as any).L;
    if (!L) return;

    leafletMapRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(getTileUrl(theme.id), {
      attribution: '',
    }).addTo(leafletMapRef.current);
  }, [theme.id, isMapReady]);

  // Invalidate size when orientation changes
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady) return;
    
    setTimeout(() => {
      leafletMapRef.current.invalidateSize();
    }, 100);
  }, [orientation, isMapReady]);
  
  return (
    <div 
      className={`relative w-full ${aspectRatio} rounded-lg shadow-2xl overflow-hidden transition-all duration-500 ${interactive ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ backgroundColor: theme.bg }}
    >
      {/* Map layer */}
      <div 
        ref={mapRef}
        className="absolute inset-0"
        style={{ backgroundColor: theme.bg }}
      />
      
      {/* Interactive hint */}
      {interactive && (
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-30">
          Karte ziehen zum Positionieren
        </div>
      )}
      
      {/* Top gradient fade */}
      <div 
        className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none z-10"
        style={{ 
          background: `linear-gradient(to bottom, ${theme.gradientColor} 0%, transparent 100%)` 
        }}
      />
      
      {/* Bottom gradient fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none z-10"
        style={{ 
          background: `linear-gradient(to top, ${theme.gradientColor} 0%, transparent 100%)` 
        }}
      />
      
      {/* Typography section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center z-20 pointer-events-none">
        {/* City name */}
        <h1 
          className={`${getFontClass()} ${fontSizes.title} mb-2 tracking-[0.3em] font-bold`}
          style={{ color: theme.text }}
        >
          {spacedText(city)}
        </h1>
        
        {/* Decorative line */}
        <div 
          className="w-24 h-px mx-auto mb-2"
          style={{ backgroundColor: theme.text }}
        />
        
        {/* Country */}
        <p 
          className={`${getFontClass()} ${fontSizes.subtitle} mb-1 tracking-[0.15em] font-light`}
          style={{ color: theme.text }}
        >
          {(countryLabel || country).toUpperCase()}
        </p>
        
        {/* Coordinates */}
        <p 
          className={`${getFontClass()} ${fontSizes.coords} opacity-70 tracking-[0.05em]`}
          style={{ color: theme.text }}
        >
          {formatCoordinates(latitude, longitude)}
        </p>
      </div>
      
      {/* Attribution */}
      <p 
        className="absolute bottom-2 right-2 text-[8px] opacity-50 font-mono z-20 pointer-events-none"
        style={{ color: theme.text }}
      >
        © OpenStreetMap contributors
      </p>
    </div>
  );
};
