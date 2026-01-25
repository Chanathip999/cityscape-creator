import { useEffect, useRef, useState, useCallback } from 'react';
import { PosterConfig } from '@/types/poster';
import 'leaflet/dist/leaflet.css';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapKey, setMapKey] = useState(0);

  // When the user interacts with the map (pan/zoom), Leaflet fires `moveend`.
  // Our external state update (lat/lng) would then trigger the "Update map view" effect
  // and reset the zoom back to the distance-derived zoom, which feels like "jumping".
  // We mark internal moves so we can avoid overriding the user's zoom.
  const internalMoveRef = useRef(false);
  const prevDistanceRef = useRef(distance);

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

  // Cleanup function
  const cleanupMap = useCallback(() => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.log('Map cleanup error:', e);
      }
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    }
  }, []);

  // Initialize map when container is ready
  useEffect(() => {
    let isMounted = true;
    
    const initializeMap = async () => {
      // Wait for container to have dimensions
      if (!mapContainerRef.current) return;
      
      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();
      
      // If container has no size, wait and retry
      if (rect.width === 0 || rect.height === 0) {
        console.log('Container has no size, waiting...');
        setTimeout(initializeMap, 100);
        return;
      }

      // Clean up any existing map
      cleanupMap();

      try {
        const L = await import('leaflet');
        
        if (!isMounted || !mapContainerRef.current) return;

        console.log('Initializing map with container size:', rect.width, rect.height);

        const map = L.map(container, {
          center: [latitude, longitude],
          zoom: getZoomFromDistance(distance),
          zoomControl: false,
          scrollWheelZoom: interactive,
          dragging: interactive,
          doubleClickZoom: interactive,
          attributionControl: false,
        });

        const tileLayer = L.tileLayer(getTileUrl(theme.id), {
          attribution: '',
          maxZoom: 19,
        }).addTo(map);

        if (interactive && onLocationChange) {
          map.on('moveend', () => {
            const center = map.getCenter();
            internalMoveRef.current = true;
            onLocationChange(center.lat, center.lng);
          });
        }

        mapInstanceRef.current = map;
        tileLayerRef.current = tileLayer;

        // Multiple invalidateSize calls to ensure proper rendering
        const invalidateSizes = () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ animate: false });
          }
        };

        // Immediate
        invalidateSizes();
        
        // After a short delay
        setTimeout(invalidateSizes, 50);
        setTimeout(invalidateSizes, 150);
        setTimeout(invalidateSizes, 300);
        setTimeout(invalidateSizes, 500);
        setTimeout(invalidateSizes, 1000);

      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeMap, 50);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      cleanupMap();
    };
  }, [mapKey, interactive]);

  // Force re-render map when orientation changes
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [orientation]);

  // Update map view when location/distance changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // If this update was caused by the user interacting with the map (pan/zoom),
    // do not override their current zoom level. We only skip when distance didn't change.
    if (interactive && internalMoveRef.current && distance === prevDistanceRef.current) {
      internalMoveRef.current = false;
      return;
    }

    // Reset the flag after handling any external update.
    internalMoveRef.current = false;
    prevDistanceRef.current = distance;
    
    mapInstanceRef.current.setView([latitude, longitude], getZoomFromDistance(distance), {
      animate: true,
      duration: 0.3,
    });
  }, [latitude, longitude, distance]);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    
    const loadNewTiles = async () => {
      const L = await import('leaflet');
      
      if (tileLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(getTileUrl(theme.id), {
          attribution: '',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }
    };
    
    loadNewTiles();
  }, [theme.id]);

  // ResizeObserver for container changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize({ animate: false });
        }, 100);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${aspectRatio} rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${interactive ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ backgroundColor: theme.bg }}
    >
      {/* Map layer - needs z-index 5 to be above gradients for interaction */}
      <div 
        key={mapKey}
        ref={mapContainerRef}
        className="absolute inset-0 z-[5]"
        style={{ 
          backgroundColor: theme.bg,
          width: '100%',
          height: '100%',
        }}
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