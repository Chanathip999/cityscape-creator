import { useEffect, useRef, useCallback } from 'react';
import { PosterConfig } from '@/types/poster';
import { useStreetData } from '@/hooks/useStreetData';

interface CanvasPosterPreviewProps {
  config: PosterConfig;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
}

// Street widths - increased for better visibility
const STREET_WIDTHS: Record<string, number> = {
  motorway: 2.5,
  primary: 2.0,
  secondary: 1.5,
  tertiary: 1.0,
  residential: 0.7,
};

const formatCoordinates = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir} / ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
};

const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join('  ');
};

// Fixed canvas size for high quality rendering
const CANVAS_BASE_WIDTH = 800;

export const CanvasPosterPreview = ({ config, onExportReady }: CanvasPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { city, country, countryLabel, latitude, longitude, distance, theme, fontFamily, fontSize, orientation } = config;
  
  // Fetch street data with compensated distance for aspect ratio
  const aspectRatio = orientation === 'horizontal' ? 4/3 : 3/4;
  const compensatedDistance = Math.ceil(distance * Math.max(1, 1 / aspectRatio) * 1.2);
  
  const { streets, isLoading, error } = useStreetData({
    latitude,
    longitude,
    distance: compensatedDistance,
    enabled: true,
  });

  // Calculate bounds that match the poster aspect ratio
  const getBounds = useCallback(() => {
    // Convert distance (meters) to degrees (approximate)
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(latitude * Math.PI / 180);
    
    // Base radius in degrees
    const latRadius = distance / metersPerDegreeLat;
    const lngRadius = distance / metersPerDegreeLng;
    
    // Adjust for aspect ratio - expand in the appropriate direction
    let finalLatRadius = latRadius;
    let finalLngRadius = lngRadius;
    
    if (aspectRatio > 1) {
      // Landscape: expand longitude (width)
      finalLngRadius = latRadius * aspectRatio;
    } else {
      // Portrait: expand latitude (height)
      finalLatRadius = lngRadius / aspectRatio;
    }
    
    return {
      minLat: latitude - finalLatRadius,
      maxLat: latitude + finalLatRadius,
      minLng: longitude - finalLngRadius,
      maxLng: longitude + finalLngRadius,
    };
  }, [latitude, longitude, distance, aspectRatio]);

  // Convert lat/lng to canvas coordinates
  const toCanvasCoords = useCallback((lat: number, lng: number, width: number, height: number, bounds: ReturnType<typeof getBounds>) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  }, []);

  // Get street color based on type and theme
  const getStreetColor = useCallback((type: string): string => {
    switch (type) {
      case 'motorway':
        return theme.roadMotorway;
      case 'primary':
        return theme.roadPrimary;
      case 'secondary':
        return theme.roadSecondary;
      case 'tertiary':
        return theme.roadTertiary;
      case 'residential':
        return theme.roadResidential;
      default:
        return theme.roadResidential;
    }
  }, [theme]);

  // Get font family CSS
  const getFontFamily = useCallback(() => {
    switch (fontFamily) {
      case 'serif':
        return 'Georgia, serif';
      case 'sans':
        return 'Inter, system-ui, sans-serif';
      case 'display':
        return 'Playfair Display, Georgia, serif';
      case 'elegant':
        return 'Cormorant Garamond, Georgia, serif';
      case 'condensed':
        return 'Oswald, sans-serif';
      default:
        return 'Roboto Mono, monospace';
    }
  }, [fontFamily]);

  // Draw the poster
  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use fixed high-resolution canvas
    const width = CANVAS_BASE_WIDTH;
    const height = width / aspectRatio;
    
    // Set canvas size at 2x for retina displays
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    // Scale context to match
    ctx.scale(scale, scale);
    
    const bounds = getBounds();

    // 1. Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw streets (from less important to most important)
    const streetOrder = ['residential', 'tertiary', 'secondary', 'primary', 'motorway'];
    
    for (const streetType of streetOrder) {
      const segment = streets.find(s => s.type === streetType);
      if (!segment) continue;

      const color = getStreetColor(streetType);
      const lineWidth = STREET_WIDTHS[streetType] || 0.7;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const polyline of segment.coordinates) {
        if (polyline.length < 2) continue;

        ctx.beginPath();
        const start = toCanvasCoords(polyline[0][0], polyline[0][1], width, height, bounds);
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < polyline.length; i++) {
          const point = toCanvasCoords(polyline[i][0], polyline[i][1], width, height, bounds);
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
    }

    // 3. Top gradient fade
    const topGradient = ctx.createLinearGradient(0, 0, 0, height * 0.2);
    topGradient.addColorStop(0, theme.gradientColor);
    topGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, height * 0.2);

    // 4. Bottom gradient fade (stronger for text legibility)
    const bottomGradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
    bottomGradient.addColorStop(0, 'transparent');
    bottomGradient.addColorStop(1, theme.gradientColor);
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);

    // 5. Typography
    const textColor = config.customTextColor || theme.text;
    
    // Font sizes based on canvas size
    const fontSizeMultiplier = fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.15 : 1;
    const mainFontSize = 48 * fontSizeMultiplier;
    const subFontSize = 18 * fontSizeMultiplier;
    const coordFontSize = 14 * fontSizeMultiplier;
    
    const fontFamilyCSS = getFontFamily();

    // City name (spaced)
    ctx.fillStyle = textColor;
    ctx.font = `bold ${mainFontSize}px ${fontFamilyCSS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const cityText = spacedText(city);
    ctx.fillText(cityText, width / 2, height * 0.86);

    // Decorative line
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.35, height * 0.895);
    ctx.lineTo(width * 0.65, height * 0.895);
    ctx.stroke();

    // Country
    ctx.font = `300 ${subFontSize}px ${fontFamilyCSS}`;
    ctx.fillText((countryLabel || country).toUpperCase(), width / 2, height * 0.925);

    // Coordinates
    ctx.globalAlpha = 0.7;
    ctx.font = `${coordFontSize}px ${fontFamilyCSS}`;
    ctx.fillText(formatCoordinates(latitude, longitude), width / 2, height * 0.955);
    ctx.globalAlpha = 1;

    // Attribution
    ctx.globalAlpha = 0.5;
    ctx.font = `10px ${fontFamilyCSS}`;
    ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap contributors', width - 12, height - 10);
    ctx.globalAlpha = 1;

    // Notify parent that canvas is ready for export
    if (onExportReady) {
      onExportReady(canvas);
    }
  }, [streets, theme, city, country, countryLabel, latitude, longitude, fontFamily, fontSize, aspectRatio, config.customTextColor, getBounds, toCanvasCoords, getStreetColor, getFontFamily, onExportReady]);

  // Redraw when dependencies change
  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      drawPoster();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawPoster]);

  const aspectClass = orientation === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]';

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${aspectClass} rounded-lg shadow-2xl overflow-hidden`}
      style={{ backgroundColor: theme.bg }}
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Lade Straßendaten...</span>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {error && !isLoading && (
        <div className="absolute top-2 right-2 bg-destructive/10 border border-destructive/30 backdrop-blur-sm px-2 py-1 rounded text-xs text-destructive z-30">
          Fehler beim Laden der Straßen
        </div>
      )}

      {/* Street count indicator (for debugging) - hidden in production */}
      {!isLoading && !error && streets.length > 0 && (
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-30 hidden">
          {streets.reduce((acc, s) => acc + s.coordinates.length, 0)} Straßensegmente
        </div>
      )}
    </div>
  );
};
