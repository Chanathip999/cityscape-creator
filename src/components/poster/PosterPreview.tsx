import { useEffect, useRef, useState, useCallback } from 'react';
import { PosterConfig, ASPECT_RATIOS } from '@/types/poster';
import 'leaflet/dist/leaflet.css';

interface PosterPreviewProps {
  config: PosterConfig;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
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
  // Much higher zoom levels for ultra-sharp tiles
  if (distance <= 2000) return 17;
  if (distance <= 3000) return 16;
  if (distance <= 5000) return 15;
  if (distance <= 8000) return 14;
  if (distance <= 12000) return 13;
  if (distance <= 18000) return 12;
  if (distance <= 25000) return 11;
  return 9;
};

const getTileUrl = (themeId: string): string => {
  const darkThemes = ['neon', 'noir', 'midnight'];
  // Use @2x retina tiles for higher resolution
  if (darkThemes.includes(themeId)) {
    return 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png';
  }
  return 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png';
};

export const PosterPreview = ({ config, onLocationChange, interactive = false, containerRef: externalContainerRef }: PosterPreviewProps) => {
  const { city, country, countryLabel, latitude, longitude, distance, theme, fontFamily, fontSize, aspectRatio, customTextColor } = config;
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapKey, setMapKey] = useState(0);

  const internalMoveRef = useRef(false);
  const prevDistanceRef = useRef(distance);

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

  const textColor = customTextColor || theme.text;

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

  // Get aspect ratio class
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square';
      case '2:3':
        return 'aspect-[2/3]';
      case '3:2':
        return 'aspect-[3/2]';
      case '3:4':
        return 'aspect-[3/4]';
      case '4:3':
        return 'aspect-[4/3]';
      case '4:5':
        return 'aspect-[4/5]';
      case '5:4':
        return 'aspect-[5/4]';
      case '9:16':
        return 'aspect-[9/16]';
      case '16:9':
        return 'aspect-video';
      case '6:19':
        return 'aspect-[6/19]';
      case '19:6':
        return 'aspect-[19/6]';
      default:
        return 'aspect-[3/4]';
    }
  };

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

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current) return;

      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setTimeout(initializeMap, 100);
        return;
      }

      cleanupMap();

      try {
        const L = await import('leaflet');

        if (!isMounted || !mapContainerRef.current) return;

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

        const invalidateSizes = () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ animate: false });
          }
        };

        invalidateSizes();
        setTimeout(invalidateSizes, 50);
        setTimeout(invalidateSizes, 150);
        setTimeout(invalidateSizes, 300);
        setTimeout(invalidateSizes, 500);
        setTimeout(invalidateSizes, 1000);
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    const timeoutId = setTimeout(initializeMap, 50);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      cleanupMap();
    };
  }, [mapKey, interactive, cleanupMap, latitude, longitude, distance, theme.id, onLocationChange]);

  useEffect(() => {
    setMapKey((prev) => prev + 1);
  }, [aspectRatio]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (interactive && internalMoveRef.current && distance === prevDistanceRef.current) {
      internalMoveRef.current = false;
      return;
    }

    internalMoveRef.current = false;
    prevDistanceRef.current = distance;

    mapInstanceRef.current.setView([latitude, longitude], getZoomFromDistance(distance), {
      animate: true,
      duration: 0.3,
    });
  }, [latitude, longitude, distance, interactive]);

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
      className={`relative w-full ${getAspectClass()} rounded-lg shadow-2xl overflow-hidden`}
      style={{ backgroundColor: theme.bg }}
    >
      {/* Map layer */}
      <div
        ref={mapContainerRef}
        key={mapKey}
        className="absolute inset-0 z-[5]"
        style={{ backgroundColor: theme.bg }}
      />

      {/* Interactive hint */}
      {interactive && (
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-20">
          Karte ziehen zum Positionieren
        </div>
      )}

      {/* Top gradient fade */}
      <div
        className="absolute top-0 left-0 right-0 h-1/4 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${theme.gradientColor} 0%, transparent 100%)`,
        }}
      />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${theme.gradientColor} 0%, transparent 100%)`,
        }}
      />

      {/* Typography section */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6 text-center pointer-events-none ${getFontClass()}`}>
        {/* City name */}
        <h2
          className={`${fontSizes.title} font-bold tracking-[0.2em] md:tracking-[0.3em] mb-2`}
          style={{ color: textColor }}
        >
          {spacedText(city)}
        </h2>


        {/* Country */}
        <p
          className={`${fontSizes.subtitle} tracking-[0.15em] mb-1 font-light`}
          style={{ color: textColor }}
        >
          {(countryLabel || country).toUpperCase()}
        </p>

        {/* Coordinates */}
        <p
          className={`${fontSizes.coords} tracking-wider opacity-70`}
          style={{ color: textColor }}
        >
          {formatCoordinates(latitude, longitude)}
        </p>
      </div>

      {/* Attribution */}
      <div
        className="absolute bottom-1 right-2 text-[6px] opacity-50 z-20"
        style={{ color: textColor }}
      >
        © OpenStreetMap contributors
      </div>
    </div>
  );
};
