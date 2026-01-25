import { useEffect, useRef, useCallback } from 'react';
import { PosterConfig } from '@/types/poster';
import { useStreetData } from '@/hooks/useStreetData';

interface CanvasPosterPreviewProps {
  config: PosterConfig;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
}

// Exact street widths from Python script
const STREET_WIDTHS: Record<string, number> = {
  motorway: 5.0,
  motorway_link: 5.0,
  trunk: 4.0,
  trunk_link: 4.0,
  primary: 4.0,
  primary_link: 4.0,
  secondary: 3.0,
  secondary_link: 3.0,
  tertiary: 2.5,
  tertiary_link: 2.5,
  residential: 2.0,
  living_street: 2.0,
  unclassified: 2.0,
  service: 1.5,
};

// Default poster dimensions (inches) from Python script
const DEFAULT_WIDTH = 12;
const DEFAULT_HEIGHT = 16;

// Canvas resolution for high quality output
const DPI = 300; // High DPI for sharp output
const CANVAS_WIDTH = DEFAULT_WIDTH * DPI;
const CANVAS_HEIGHT = DEFAULT_HEIGHT * DPI;

const formatCoordinates = (lat: number, lon: number): string => {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lonStr}`;
};

// Python: spaced_city = "  ".join(list(city.upper()))
const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join('  ');
};

// Create gradient fade effect (matching Python create_gradient_fade)
const createGradientFade = (
  ctx: CanvasRenderingContext2D,
  color: string,
  location: 'top' | 'bottom',
  width: number,
  height: number
) => {
  let gradient: CanvasGradient;
  let yStart: number;
  let yEnd: number;
  let fadeHeight: number;

  if (location === 'bottom') {
    yStart = height * 0.75;
    yEnd = height;
    fadeHeight = height * 0.25;
    gradient = ctx.createLinearGradient(0, yStart, 0, yEnd);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
  } else {
    yStart = 0;
    yEnd = height * 0.25;
    fadeHeight = height * 0.25;
    gradient = ctx.createLinearGradient(0, yStart, 0, yEnd);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, location === 'top' ? 0 : height * 0.75, width, fadeHeight);
};

export const CanvasPosterPreview = ({ config, onExportReady }: CanvasPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    city,
    country,
    countryLabel,
    latitude,
    longitude,
    distance,
    theme,
    fontFamily,
    fontSize,
    orientation,
  } = config;

  // Calculate poster dimensions based on orientation
  const posterWidth = orientation === 'horizontal' ? DEFAULT_HEIGHT : DEFAULT_WIDTH;
  const posterHeight = orientation === 'horizontal' ? DEFAULT_WIDTH : DEFAULT_HEIGHT;
  const aspectRatio = posterWidth / posterHeight;

  // Python: compensated_dist = dist * (max(height, width) / min(height, width))/4
  const compensatedDistance = Math.ceil(
    distance * (Math.max(posterHeight, posterWidth) / Math.min(posterHeight, posterWidth)) / 4
  );

  // Increase fetch radius to ensure full coverage
  const fetchDistance = Math.max(distance, compensatedDistance) * 1.5;

  const { streets, isLoading, error } = useStreetData({
    latitude,
    longitude,
    distance: fetchDistance,
    enabled: true,
  });

  // Get street color based on highway type (matching Python get_edge_colors_by_type)
  const getStreetColor = useCallback(
    (type: string): string => {
      if (['motorway', 'motorway_link'].includes(type)) {
        return theme.roadMotorway;
      } else if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(type)) {
        return theme.roadPrimary;
      } else if (['secondary', 'secondary_link'].includes(type)) {
        return theme.roadSecondary;
      } else if (['tertiary', 'tertiary_link'].includes(type)) {
        return theme.roadTertiary;
      } else if (['residential', 'living_street', 'unclassified'].includes(type)) {
        return theme.roadResidential;
      } else {
        return theme.roadService || theme.roadResidential;
      }
    },
    [theme]
  );

  // Get street width based on highway type (matching Python get_edge_widths_by_type)
  const getStreetWidth = useCallback((type: string): number => {
    return STREET_WIDTHS[type] || 0.4;
  }, []);

  // Get font family CSS
  const getFontFamily = useCallback(() => {
    switch (fontFamily) {
      case 'serif':
        return 'Georgia, "Times New Roman", serif';
      case 'sans':
        return 'Inter, -apple-system, sans-serif';
      case 'display':
        return '"Playfair Display", Georgia, serif';
      case 'elegant':
        return '"Cormorant Garamond", Georgia, serif';
      case 'condensed':
        return 'Oswald, "Arial Narrow", sans-serif';
      default:
        return '"Roboto Mono", "Courier New", monospace';
    }
  }, [fontFamily]);

  // Calculate crop limits to maintain aspect ratio (matching Python get_crop_limits)
  const getCropLimits = useCallback(() => {
    // Convert distance to degrees (approximate mercator projection)
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos((latitude * Math.PI) / 180);

    // Start from the requested radius
    let halfX = distance / metersPerDegreeLng;
    let halfY = distance / metersPerDegreeLat;

    // Cut inward to match aspect ratio
    if (aspectRatio > 1) {
      // Landscape: reduce height
      halfY = halfX / aspectRatio;
    } else {
      // Portrait: reduce width
      halfX = halfY * aspectRatio;
    }

    return {
      minLng: longitude - halfX,
      maxLng: longitude + halfX,
      minLat: latitude - halfY,
      maxLat: latitude + halfY,
    };
  }, [latitude, longitude, distance, aspectRatio]);

  // Convert lat/lng to canvas coordinates
  const toCanvasCoords = useCallback(
    (
      lat: number,
      lng: number,
      canvasWidth: number,
      canvasHeight: number,
      bounds: ReturnType<typeof getCropLimits>
    ) => {
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * canvasWidth;
      const y = canvasHeight - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * canvasHeight;
      return { x, y };
    },
    []
  );

  // Main drawing function
  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on orientation
    const width = orientation === 'horizontal' ? CANVAS_HEIGHT : CANVAS_WIDTH;
    const height = orientation === 'horizontal' ? CANVAS_WIDTH : CANVAS_HEIGHT;

    canvas.width = width;
    canvas.height = height;

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bounds = getCropLimits();

    // 1. Background (matching Python: ax.set_facecolor(THEME['bg']))
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw streets layer by layer (matching Python road hierarchy)
    // Draw in order: residential -> tertiary -> secondary -> primary -> motorway
    const streetOrder = ['residential', 'tertiary', 'secondary', 'primary', 'motorway'];

    for (const streetType of streetOrder) {
      const segment = streets.find((s) => s.type === streetType);
      if (!segment) continue;

      const color = getStreetColor(streetType);
      const baseWidth = getStreetWidth(streetType);
      // Scale line width with canvas size
      const lineWidth = baseWidth;

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

    // 3. Gradients (matching Python create_gradient_fade)
    createGradientFade(ctx, theme.gradientColor, 'top', width, height);
    createGradientFade(ctx, theme.gradientColor, 'bottom', width, height);

    // 4. Typography (matching Python font sizing and positioning)
    const textColor = config.customTextColor || theme.text;
    const scaleFactor = width / (DEFAULT_WIDTH * DPI);

    // Python base font sizes at 12 inches width
    const BASE_MAIN = 60;
    const BASE_SUB = 22;
    const BASE_COORDS = 14;
    const BASE_ATTR = 8;

    const fontSizeMultiplier = fontSize === 'small' ? 0.8 : fontSize === 'large' ? 1.2 : 1;
    const fontFamilyCSS = getFontFamily();

    // --- Bottom text (matching Python positioning) ---
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // City name with letter spacing
    const mainFontSize = BASE_MAIN * scaleFactor * fontSizeMultiplier;
    
    // Adjust font size for long city names (matching Python logic)
    const cityCharCount = city.length;
    let adjustedMainFontSize = mainFontSize;
    if (cityCharCount > 10) {
      const lengthFactor = 10 / cityCharCount;
      adjustedMainFontSize = Math.max(mainFontSize * lengthFactor, 10 * scaleFactor);
    }

    ctx.font = `bold ${adjustedMainFontSize}px ${fontFamilyCSS}`;
    const cityText = spacedText(city);
    ctx.fillText(cityText, width / 2, height * 0.86);

    // Country (matching Python: 0.10 from bottom = 0.90 from top)
    const subFontSize = BASE_SUB * scaleFactor * fontSizeMultiplier;
    ctx.font = `300 ${subFontSize}px ${fontFamilyCSS}`;
    ctx.fillText((countryLabel || country).toUpperCase(), width / 2, height * 0.90);

    // Coordinates (matching Python: 0.07 from bottom = 0.93 from top)
    const coordFontSize = BASE_COORDS * scaleFactor * fontSizeMultiplier;
    ctx.globalAlpha = 0.7;
    ctx.font = `${coordFontSize}px ${fontFamilyCSS}`;
    ctx.fillText(formatCoordinates(latitude, longitude), width / 2, height * 0.93);
    ctx.globalAlpha = 1;

    // Decorative line (matching Python: between 0.4 and 0.6 at y=0.875)
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1 * scaleFactor;
    ctx.beginPath();
    ctx.moveTo(width * 0.4, height * 0.875);
    ctx.lineTo(width * 0.6, height * 0.875);
    ctx.stroke();

    // Attribution (matching Python: bottom right)
    const attrFontSize = BASE_ATTR * scaleFactor;
    ctx.globalAlpha = 0.5;
    ctx.font = `${attrFontSize}px ${fontFamilyCSS}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('© OpenStreetMap contributors', width - 10, height - 10);
    ctx.globalAlpha = 1;

    // Notify parent that canvas is ready
    if (onExportReady) {
      onExportReady(canvas);
    }
  }, [
    streets,
    theme,
    city,
    country,
    countryLabel,
    latitude,
    longitude,
    orientation,
    fontSize,
    config.customTextColor,
    getCropLimits,
    toCanvasCoords,
    getStreetColor,
    getStreetWidth,
    getFontFamily,
    onExportReady,
  ]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  useEffect(() => {
    const handleResize = () => drawPoster();
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
      <canvas ref={canvasRef} className="w-full h-full object-contain" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Lade Straßendaten...</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute top-2 right-2 bg-destructive/10 border border-destructive/30 backdrop-blur-sm px-2 py-1 rounded text-xs text-destructive z-30">
          Fehler beim Laden der Straßen
        </div>
      )}
    </div>
  );
};
