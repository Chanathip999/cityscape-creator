import { useEffect, useRef, useCallback } from 'react';
import { PosterConfig } from '@/types/poster';
import { useStreetData, StreetSegment } from '@/hooks/useStreetData';

interface CanvasPosterPreviewProps {
  config: PosterConfig;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
}

// Street widths matching the Python script hierarchy
const STREET_WIDTHS: Record<string, number> = {
  motorway: 1.2,
  primary: 1.0,
  secondary: 0.8,
  tertiary: 0.6,
  residential: 0.4,
};

const formatCoordinates = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir} / ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
};

const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join('  ');
};

export const CanvasPosterPreview = ({ config, onExportReady }: CanvasPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { city, country, countryLabel, latitude, longitude, distance, theme, fontFamily, fontSize, orientation } = config;
  
  // Fetch street data
  const { streets, isLoading, error } = useStreetData({
    latitude,
    longitude,
    distance,
    enabled: true,
  });

  // Calculate bounds from distance
  const getBounds = useCallback(() => {
    // Convert distance (meters) to degrees (approximate)
    const latDelta = distance / 111320; // 1 degree latitude ≈ 111.32 km
    const lngDelta = distance / (111320 * Math.cos(latitude * Math.PI / 180));
    
    return {
      minLat: latitude - latDelta,
      maxLat: latitude + latDelta,
      minLng: longitude - lngDelta,
      maxLng: longitude + lngDelta,
    };
  }, [latitude, longitude, distance]);

  // Convert lat/lng to canvas coordinates
  const toCanvasCoords = useCallback((lat: number, lng: number, width: number, height: number, bounds: ReturnType<typeof getBounds>) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height; // Flip Y
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

    // Get container size and set canvas size (with pixel ratio for sharpness)
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Aspect ratio based on orientation
    const aspectRatio = orientation === 'horizontal' ? 4/3 : 3/4;
    let canvasWidth = rect.width;
    let canvasHeight = canvasWidth / aspectRatio;
    
    // Limit height to container
    if (canvasHeight > rect.height) {
      canvasHeight = rect.height;
      canvasWidth = canvasHeight * aspectRatio;
    }

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    
    ctx.scale(dpr, dpr);

    const width = canvasWidth;
    const height = canvasHeight;
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
      const lineWidth = (STREET_WIDTHS[streetType] || 0.4) * (width / 400); // Scale with canvas size
      
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
    const topGradient = ctx.createLinearGradient(0, 0, 0, height * 0.25);
    topGradient.addColorStop(0, theme.gradientColor);
    topGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, height * 0.25);

    // 4. Bottom gradient fade
    const bottomGradient = ctx.createLinearGradient(0, height * 0.67, 0, height);
    bottomGradient.addColorStop(0, 'transparent');
    bottomGradient.addColorStop(1, theme.gradientColor);
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, height * 0.67, width, height * 0.33);

    // 5. Typography
    const textColor = config.customTextColor || theme.text;
    const scale = width / 400; // Base scale factor
    
    // Font sizes
    const fontSizeMultiplier = fontSize === 'small' ? 0.8 : fontSize === 'large' ? 1.2 : 1;
    const mainFontSize = 28 * scale * fontSizeMultiplier;
    const subFontSize = 14 * scale * fontSizeMultiplier;
    const coordFontSize = 10 * scale * fontSizeMultiplier;
    
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
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(width * 0.35, height * 0.89);
    ctx.lineTo(width * 0.65, height * 0.89);
    ctx.stroke();

    // Country
    ctx.font = `300 ${subFontSize}px ${fontFamilyCSS}`;
    ctx.fillText((countryLabel || country).toUpperCase(), width / 2, height * 0.92);

    // Coordinates
    ctx.globalAlpha = 0.7;
    ctx.font = `${coordFontSize}px ${fontFamilyCSS}`;
    ctx.fillText(formatCoordinates(latitude, longitude), width / 2, height * 0.95);
    ctx.globalAlpha = 1;

    // Attribution
    ctx.globalAlpha = 0.5;
    ctx.font = `${6 * scale}px ${fontFamilyCSS}`;
    ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap contributors', width - 8 * scale, height - 6 * scale);
    ctx.globalAlpha = 1;

    // Notify parent that canvas is ready for export
    if (onExportReady) {
      onExportReady(canvas);
    }
  }, [streets, theme, city, country, countryLabel, latitude, longitude, fontFamily, fontSize, orientation, config.customTextColor, getBounds, toCanvasCoords, getStreetColor, getFontFamily, onExportReady]);

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

  const aspectRatio = orientation === 'horizontal' ? 'aspect-[4/3]' : 'aspect-[3/4]';

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${aspectRatio} rounded-lg shadow-2xl overflow-hidden`}
      style={{ backgroundColor: theme.bg }}
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
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

      {/* Street count indicator (for debugging) */}
      {!isLoading && !error && streets.length > 0 && (
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-30">
          {streets.reduce((acc, s) => acc + s.coordinates.length, 0)} Straßensegmente
        </div>
      )}
    </div>
  );
};
