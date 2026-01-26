import { useEffect, useRef, useCallback } from 'react';
import { PosterConfig, ASPECT_RATIOS } from '@/types/poster';
import { useStreetData } from '@/hooks/useStreetData';

interface CanvasPosterPreviewProps {
  config: PosterConfig;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

// Street widths matching Python script - very fine lines for elegant look
// These are absolute pixel values at 300 DPI base resolution
const STREET_WIDTHS: Record<string, number> = {
  motorway: 5.0,
  motorway_link: 4.0,
  trunk: 4.0,
  trunk_link: 3.5,
  primary: 3.5,
  primary_link: 3.0,
  secondary: 2.5,
  secondary_link: 2.0,
  tertiary: 1.8,
  tertiary_link: 1.5,
  residential: 1.2,
  living_street: 1.0,
  unclassified: 1.0,
  service: 0.8,
};

// High DPI for sharp output
const DPI = 300;
const BASE_SIZE = 12; // Base size in inches

const formatCoordinates = (lat: number, lon: number): string => {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lonStr}`;
};

const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join('  ');
};

const createGradientFade = (
  ctx: CanvasRenderingContext2D,
  color: string,
  location: 'top' | 'bottom',
  width: number,
  height: number
) => {
  let gradient: CanvasGradient;
  let yStart: number;
  let fadeHeight: number;

  if (location === 'bottom') {
    yStart = height * 0.75;
    fadeHeight = height * 0.25;
    gradient = ctx.createLinearGradient(0, yStart, 0, height);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
  } else {
    yStart = 0;
    fadeHeight = height * 0.25;
    gradient = ctx.createLinearGradient(0, 0, 0, fadeHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, location === 'top' ? 0 : height * 0.75, width, fadeHeight);
};

export const CanvasPosterPreview = ({ config, onExportReady, containerRef: externalContainerRef }: CanvasPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;

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
    aspectRatio,
  } = config;

  // Get aspect ratio dimensions
  const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === aspectRatio) || ASPECT_RATIOS[1];
  const ratioWidth = aspectRatioConfig.width;
  const ratioHeight = aspectRatioConfig.height;
  const aspectValue = ratioWidth / ratioHeight;

  // Calculate canvas dimensions based on aspect ratio
  const canvasWidth = aspectValue >= 1 
    ? BASE_SIZE * DPI 
    : Math.round(BASE_SIZE * DPI * aspectValue);
  const canvasHeight = aspectValue >= 1 
    ? Math.round(BASE_SIZE * DPI / aspectValue)
    : BASE_SIZE * DPI;

  // Calculate compensated distance for data fetching (matching Python script formula)
  const compensatedDistance = Math.ceil(
    distance * (Math.max(ratioHeight, ratioWidth) / Math.min(ratioHeight, ratioWidth)) / 4
  );
  const fetchDistance = Math.max(distance, compensatedDistance) * 1.5;

  const { streets, water, parks, isLoading, error } = useStreetData({
    latitude,
    longitude,
    distance: fetchDistance,
    enabled: true,
  });

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

  const getStreetWidth = useCallback((type: string): number => {
    // Return absolute pixel width - no scaling needed as canvas is already at target DPI
    return STREET_WIDTHS[type] || 0.8;
  }, []);

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

  const getCropLimits = useCallback(() => {
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos((latitude * Math.PI) / 180);

    let halfX = distance / metersPerDegreeLng;
    let halfY = distance / metersPerDegreeLat;

    // Adjust bounds based on aspect ratio (matching Python script logic)
    if (aspectValue > 1) {
      // Landscape: reduce height
      halfY = halfX / aspectValue;
    } else if (aspectValue < 1) {
      // Portrait: reduce width
      halfX = halfY * aspectValue;
    }
    // Square (1:1): keep equal

    return {
      minLng: longitude - halfX,
      maxLng: longitude + halfX,
      minLat: latitude - halfY,
      maxLat: latitude + halfY,
    };
  }, [latitude, longitude, distance, aspectValue]);

  const toCanvasCoords = useCallback(
    (
      lat: number,
      lng: number,
      width: number,
      height: number,
      bounds: ReturnType<typeof getCropLimits>
    ) => {
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
      const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
      return { x, y };
    },
    []
  );

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvasWidth;
    const height = canvasHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bounds = getCropLimits();

    // Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Draw parks (if available)
    if (parks && parks.length > 0) {
      ctx.fillStyle = theme.parks;
      for (const polygon of parks) {
        if (polygon.length < 3) continue;
        
        ctx.beginPath();
        const start = toCanvasCoords(polygon[0][0], polygon[0][1], width, height, bounds);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < polygon.length; i++) {
          const point = toCanvasCoords(polygon[i][0], polygon[i][1], width, height, bounds);
          ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Layer 2: Draw water (if available)
    if (water && water.length > 0) {
      ctx.fillStyle = theme.water;
      for (const polygon of water) {
        if (polygon.length < 3) continue;
        
        ctx.beginPath();
        const start = toCanvasCoords(polygon[0][0], polygon[0][1], width, height, bounds);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < polygon.length; i++) {
          const point = toCanvasCoords(polygon[i][0], polygon[i][1], width, height, bounds);
          ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Layer 3: Draw streets in order (residential first, motorway last for proper layering)
    const streetOrder = ['service', 'residential', 'tertiary', 'secondary', 'primary', 'motorway'];

    for (const streetType of streetOrder) {
      const segment = streets.find((s) => s.type === streetType);
      if (!segment) continue;

      const color = getStreetColor(streetType);
      const lineWidth = getStreetWidth(streetType);

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

    // Layer 4: Gradients
    createGradientFade(ctx, theme.gradientColor, 'top', width, height);
    createGradientFade(ctx, theme.gradientColor, 'bottom', width, height);

    // Layer 5: Typography
    const textColor = config.customTextColor || theme.text;
    const scaleFactor = width / (BASE_SIZE * DPI);

    const BASE_MAIN = 60;
    const BASE_SUB = 22;
    const BASE_COORDS = 14;
    const BASE_ATTR = 8;

    const fontSizeMultiplier = fontSize === 'small' ? 0.8 : fontSize === 'large' ? 1.2 : 1;
    const fontFamilyCSS = getFontFamily();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // City name - dynamically adjust based on length (matching Python script)
    const mainFontSize = BASE_MAIN * scaleFactor * fontSizeMultiplier;
    const cityCharCount = city.length;
    let adjustedMainFontSize = mainFontSize;
    if (cityCharCount > 10) {
      const lengthFactor = 10 / cityCharCount;
      adjustedMainFontSize = Math.max(mainFontSize * lengthFactor, 10 * scaleFactor);
    }

    ctx.font = `bold ${adjustedMainFontSize}px ${fontFamilyCSS}`;
    const cityText = spacedText(city);
    ctx.fillText(cityText, width / 2, height * 0.86);

    // Separator line (matching Python script)
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1 * scaleFactor;
    ctx.beginPath();
    ctx.moveTo(width * 0.4, height * 0.875);
    ctx.lineTo(width * 0.6, height * 0.875);
    ctx.stroke();

    // Country
    const subFontSize = BASE_SUB * scaleFactor * fontSizeMultiplier;
    ctx.font = `300 ${subFontSize}px ${fontFamilyCSS}`;
    ctx.fillText((countryLabel || country).toUpperCase(), width / 2, height * 0.90);

    // Coordinates
    const coordFontSize = BASE_COORDS * scaleFactor * fontSizeMultiplier;
    ctx.globalAlpha = 0.7;
    ctx.font = `${coordFontSize}px ${fontFamilyCSS}`;
    ctx.fillText(formatCoordinates(latitude, longitude), width / 2, height * 0.93);
    ctx.globalAlpha = 1;


    // Attribution
    const attrFontSize = BASE_ATTR * scaleFactor;
    ctx.globalAlpha = 0.5;
    ctx.font = `${attrFontSize}px ${fontFamilyCSS}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('© OpenStreetMap contributors', width - 10, height - 10);
    ctx.globalAlpha = 1;

    if (onExportReady) {
      onExportReady(canvas);
    }
  }, [
    streets,
    water,
    parks,
    theme,
    city,
    country,
    countryLabel,
    latitude,
    longitude,
    fontSize,
    config.customTextColor,
    canvasWidth,
    canvasHeight,
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

  // Dynamic aspect ratio class
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${getAspectClass()} rounded-lg shadow-2xl overflow-hidden`}
      style={{ backgroundColor: theme.bg }}
    >
      <canvas ref={canvasRef} className="w-full h-full object-contain" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Lade Kartendaten...</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute top-2 right-2 bg-destructive/10 border border-destructive/30 backdrop-blur-sm px-2 py-1 rounded text-xs text-destructive z-30">
          Fehler beim Laden der Daten
        </div>
      )}
    </div>
  );
};
