import { useEffect, useRef, useState, useCallback } from 'react';
import { PosterConfig } from '@/types/poster';
import { useStreetData } from '@/hooks/useStreetData';
import { StreetLayer } from './StreetLayer';
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

const getTileUrl = (themeId: string, preferLight = false): string => {
  // Label-free tiles for subtle context under vector streets.
  // When colored streets are enabled, we prefer light tiles for better contrast.
  if (preferLight) {
    return 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
  }

  const darkThemes = ['neon', 'noir', 'midnight'];
  if (darkThemes.includes(themeId)) {
    return 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
  }
  return 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
};

export const PosterPreview = ({ config, onLocationChange, interactive = false }: PosterPreviewProps) => {
  const { city, country, countryLabel, latitude, longitude, distance, theme, fontFamily, fontSize, orientation, customTextColor, coloredStreets } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapKey, setMapKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  // Only fetch street vector data when coloredStreets is enabled
  const { streets, isLoading: streetsLoading } = useStreetData({
    latitude,
    longitude,
    distance,
    enabled: coloredStreets === true,
  });

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
      case 'display':
        return 'font-display';
      case 'elegant':
        return 'font-elegant';
      case 'condensed':
        return 'font-condensed';
      default:
        return 'font-mono';
    }
  };

  // Get the actual text color (custom or theme)
  const textColor = customTextColor || theme.text;

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
      setMapReady(false);
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

        // Create map with a subtle, label-free tile layer for context.
        const map = L.map(container, {
          center: [latitude, longitude],
          zoom: getZoomFromDistance(distance),
          zoomControl: false,
          scrollWheelZoom: interactive,
          dragging: interactive,
          doubleClickZoom: interactive,
          attributionControl: false,
        });

        // Keep the base map clearly visible even when colored streets are enabled
        const tileOpacity = 1;
        const tileLayer = L.tileLayer(getTileUrl(theme.id, coloredStreets), {
          attribution: '',
          maxZoom: 19,
          opacity: tileOpacity,
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
        setMapReady(true);

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
    (async () => {
      const L = await import('leaflet');
      if (!mapInstanceRef.current) return;

      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch {
        // ignore
      }

       tileLayerRef.current = L.tileLayer(getTileUrl(theme.id, coloredStreets), {
        attribution: '',
        maxZoom: 19,
        opacity: 0.35,
      }).addTo(mapInstanceRef.current);
    })();
  }, [theme.id, coloredStreets]);

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
      
      {/* Vector street layer - only when coloredStreets is enabled */}
      {coloredStreets && mapReady && mapInstanceRef.current && (
        <StreetLayer 
          streets={streets} 
          theme={theme} 
          mapInstance={mapInstanceRef.current} 
        />
      )}
      
      {/* Loading indicator for streets */}
      {coloredStreets && streetsLoading && (
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-30">
          Lade Straßen...
        </div>
      )}
      
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
          background: `linear-gradient(to bottom, ${theme.gradientColor} 0%, transparent 100%)`,
          opacity: coloredStreets ? 0.25 : 1,
        }}
      />
      
      {/* Bottom gradient fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none z-10"
        style={{ 
          background: `linear-gradient(to top, ${theme.gradientColor} 0%, transparent 100%)`,
          opacity: coloredStreets ? 0.25 : 1,
        }}
      />
      
      {/* Typography section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center z-20 pointer-events-none">
        {/* City name */}
        <h1 
          className={`${getFontClass()} ${fontSizes.title} mb-2 tracking-[0.3em] font-bold`}
          style={{ color: textColor }}
        >
          {spacedText(city)}
        </h1>
        
        {/* Decorative line */}
        <div 
          className="w-24 h-px mx-auto mb-2"
          style={{ backgroundColor: textColor }}
        />
        
        {/* Country */}
        <p 
          className={`${getFontClass()} ${fontSizes.subtitle} mb-1 tracking-[0.15em] font-light`}
          style={{ color: textColor }}
        >
          {(countryLabel || country).toUpperCase()}
        </p>
        
        {/* Coordinates */}
        <p 
          className={`${getFontClass()} ${fontSizes.coords} opacity-70 tracking-[0.05em]`}
          style={{ color: textColor }}
        >
          {formatCoordinates(latitude, longitude)}
        </p>
      </div>
      
      {/* Attribution */}
      <p 
        className="absolute bottom-2 right-2 text-[8px] opacity-50 font-mono z-20 pointer-events-none"
        style={{ color: textColor }}
      >
        © OpenStreetMap contributors
      </p>
    </div>
  );
};