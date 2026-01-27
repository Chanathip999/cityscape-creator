/**
 * Canvas-based Poster Preview for Minimalist (Vector) mode.
 * 
 * IMPORTANT: This component's rendering logic is based on the maptoposter Python script:
 * https://github.com/Chanathip999/maptoposter/blob/main/create_map_poster.py
 * 
 * When modifying this component, always refer to the original Python implementation
 * to ensure visual parity with the reference output.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { PosterConfig, ASPECT_RATIOS } from '@/types/poster';
import { useStreetData } from '@/hooks/useStreetData';
import {
  FONT_STACKS,
  TRACKING,
  getTextPositions,
  FONT_WEIGHTS,
  formatCoordinates,
  formatDisplayText,
  getScaledFontSizes,
  drawTextWithTracking,
} from '@/lib/posterTypography';

interface CanvasPosterPreviewProps {
  config: PosterConfig;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Street widths - balanced for visibility and detail
 */
const STREET_WIDTHS: Record<string, number> = {
  motorway: 1.0,
  motorway_link: 0.8,
  trunk: 0.8,
  trunk_link: 0.7,
  primary: 0.7,
  primary_link: 0.6,
  secondary: 0.5,
  secondary_link: 0.45,
  tertiary: 0.42,
  tertiary_link: 0.38,
  residential: 0.4,
  living_street: 0.4,
  unclassified: 0.4,
  service: 0.34,
  pedestrian: 0.29,
  footway: 0.25,
  path: 0.25,
  cycleway: 0.25,
  track: 0.25,
  steps: 0.21,
  bridleway: 0.25,
};

// Railway width (z-order 2.5 in Python, between parks and roads)
const RAILWAY_WIDTH = 0.5;

// DPI and base size for high resolution output
const DPI = 300;
const BASE_SIZE = 12; // Python uses 12 inches

// Prevent right-click context menu to protect poster content
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  return false;
};

export const CanvasPosterPreview = ({ config, onExportReady, containerRef: externalContainerRef }: CanvasPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;

  // Pan/Zoom state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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
    layerVisibility,
    customRoadColor,
    customBackgroundColor,
    showCoordinates,
    showCountry,
    showCity,
    showGradients,
    textPosition,
  } = config;

  // Get text positions based on textPosition setting
  const TEXT_POSITIONS = getTextPositions(textPosition);

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

  // Calculate compensated distance for data fetching
  const compensatedDistance = Math.ceil(
    distance * (Math.max(ratioHeight, ratioWidth) / Math.min(ratioHeight, ratioWidth)) / 4
  );
  // Fetch a bit beyond the crop to allow panning without constantly re-fetching.
  // Too high increases tile count and backend load.
  const fetchDistance = Math.max(distance, compensatedDistance) * 1.5;

  const { streets, railways, aeroways, coastlines, water, parks, forests, isLoading, error } = useStreetData({
    latitude,
    longitude,
    distance: fetchDistance,
    enabled: true,
  });

  // Reset pan/zoom when location or aspect ratio changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
  }, [latitude, longitude, aspectRatio]);

  const getStreetColor = useCallback(
    (type: string): string => {
      // Use custom road color if set
      if (customRoadColor) {
        // Return custom color with slight variations for hierarchy
        return customRoadColor;
      }
      
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
    [theme, customRoadColor]
  );

  const getStreetWidth = useCallback((type: string, canvasWidth: number): number => {
    // Scale factor: base 864px (12 inches at 72 DPI)
    const baseWidth = STREET_WIDTHS[type] || 0.25;
    const scaleFactor = canvasWidth / 864;
    // Finer minimum widths for more detail
    const minWidth = ['motorway', 'primary', 'trunk'].includes(type) ? 0.8 : 0.3;
    return Math.max(minWidth, Math.min(baseWidth * scaleFactor, 6));
  }, []);

  // Helper to adjust color brightness/saturation for forests
  const adjustColor = useCallback((hexColor: string, darken: number, saturate: number): string => {
    // Parse hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return hexColor;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    // Darken
    r = Math.max(0, r - darken);
    g = Math.max(0, g - darken + saturate); // Boost green for forest feel
    b = Math.max(0, b - darken);
    
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  const getCropLimits = useCallback(() => {
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos((latitude * Math.PI) / 180);

    // Apply zoom to effective distance
    const effectiveDistance = distance / zoom;

    // IMPORTANT: Keep a true 90° orthographic feel by ensuring the same meter-per-pixel
    // scale on both axes.
    //
    // The previous implementation adjusted *degrees* directly (halfX/halfY), which
    // introduces distortion at higher latitudes (e.g. Berlin/NY) because degrees
    // of longitude represent fewer meters than degrees of latitude.
    //
    // Correct approach: adjust in meters first, then convert to degrees per axis.
    let halfWidthMeters = effectiveDistance;
    let halfHeightMeters = effectiveDistance;

    if (aspectValue > 1) {
      // wide: keep width, reduce height
      halfHeightMeters = halfWidthMeters / aspectValue;
    } else if (aspectValue < 1) {
      // tall: keep height, reduce width
      halfWidthMeters = halfHeightMeters * aspectValue;
    }

    const halfX = halfWidthMeters / metersPerDegreeLng;
    const halfY = halfHeightMeters / metersPerDegreeLat;

    // Apply pan offset (convert from pixel offset to degree offset)
    const panDegreesX = (panOffset.x / canvasWidth) * (halfX * 2);
    const panDegreesY = (panOffset.y / canvasHeight) * (halfY * 2);

    return {
      minLng: longitude - halfX - panDegreesX,
      maxLng: longitude + halfX - panDegreesX,
      minLat: latitude - halfY + panDegreesY,
      maxLat: latitude + halfY + panDegreesY,
    };
  }, [latitude, longitude, distance, aspectValue, zoom, panOffset, canvasWidth, canvasHeight]);

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

    // =========================================
    // Z-ORDER (from maptoposter Python script):
    // z=0  Background color
    // z=1  Water (blue polygons)
    // z=2  Parks (green polygons)
    // z=2.5 Railways
    // z=3  Roads (via ox.plot_graph)
    // z=10 Gradient fades (top & bottom)
    // z=11 Text labels (city, country, coords)
    // =========================================

    // z=0: Background
    const bgColor = customBackgroundColor || theme.bg;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // z=0.5: Draw coastlines (land-water boundaries)
    if (layerVisibility.coastlines && coastlines && coastlines.length > 0) {
      ctx.strokeStyle = theme.water;
      ctx.lineWidth = Math.max(2, 3 * (width / 864));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      for (const polyline of coastlines) {
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

    // z=1: Draw water (below parks)
    if (layerVisibility.water && water && water.length > 0) {
      ctx.fillStyle = theme.water;
      ctx.strokeStyle = theme.water;
      ctx.lineWidth = Math.max(1, 2 * (width / 864));
      
      for (const polygon of water) {
        if (polygon.length < 2) continue;
        
        ctx.beginPath();
        const start = toCanvasCoords(polygon[0][0], polygon[0][1], width, height, bounds);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < polygon.length; i++) {
          const point = toCanvasCoords(polygon[i][0], polygon[i][1], width, height, bounds);
          ctx.lineTo(point.x, point.y);
        }
        
        // Rivers/streams are lines, lakes are polygons
        if (polygon.length >= 3) {
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.stroke();
        }
      }
    }

    // z=1.5: Draw forests (below parks, above water)
    if (layerVisibility.forests && forests && forests.length > 0) {
      // Slightly darker/greener than parks
      const forestColor = adjustColor(theme.parks, -20, 10);
      ctx.fillStyle = forestColor;
      
      for (const polygon of forests) {
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

    // z=2: Draw parks (above water/forests)
    if (layerVisibility.parks && parks && parks.length > 0) {
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

    // z=2.3: Draw aeroways (runways, taxiways)
    if (layerVisibility.aeroways && aeroways && aeroways.length > 0) {
      // Runways are typically gray/dark
      ctx.strokeStyle = theme.roadService || '#666666';
      ctx.lineWidth = Math.max(3, 6 * (width / 864));
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      
      for (const polyline of aeroways) {
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

    // z=2.5: Draw railways (between parks and roads)
    if (layerVisibility.railways && railways && railways.length > 0) {
      const railwayColor = theme.railway || theme.text;
      const railwayWidth = Math.max(0.5, RAILWAY_WIDTH * (width / 864));
      
      ctx.strokeStyle = railwayColor;
      ctx.lineWidth = railwayWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      for (const polyline of railways) {
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

    // z=3: Draw streets (service first → motorway last for proper layering)
    const streetOrder = ['service', 'residential', 'tertiary', 'secondary', 'primary', 'motorway'];

    for (const streetType of streetOrder) {
      const segment = streets.find((s) => s.type === streetType);
      if (!segment) continue;

      const color = getStreetColor(streetType);
      const lineWidth = getStreetWidth(streetType, width);

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

    // z=10: Gradient fades (top & bottom) - conditional
    if (showGradients) {
      const fadeHeight = height * 0.25;
      const gradientBgColor = customBackgroundColor || theme.bg;
      
      const topGradient = ctx.createLinearGradient(0, 0, 0, fadeHeight);
      topGradient.addColorStop(0, gradientBgColor);
      topGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, width, fadeHeight);
      
      const bottomGradient = ctx.createLinearGradient(0, height - fadeHeight, 0, height);
      bottomGradient.addColorStop(0, 'transparent');
      bottomGradient.addColorStop(1, gradientBgColor);
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, height - fadeHeight, width, fadeHeight);
    }

    // z=11: Typography (text labels)
    const textColor = config.customTextColor || theme.text;
    const fontStack = FONT_STACKS[fontFamily];
    const scaledFonts = getScaledFontSizes(height, fontSize);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // City name with dynamic size adjustment (only if showCity is true)
    if (showCity) {
      const cityCharCount = city.length;
      let adjustedTitleSize = scaledFonts.title;
      if (cityCharCount > 10) {
        const lengthFactor = 10 / cityCharCount;
        adjustedTitleSize = Math.max(scaledFonts.title * lengthFactor, 20 * (height / 1000));
      }

      const cityText = formatDisplayText(city);
      ctx.font = `${FONT_WEIGHTS.title} ${adjustedTitleSize}px ${fontStack}`;
      drawTextWithTracking(
        ctx,
        cityText,
        width / 2,
        height * TEXT_POSITIONS.title,
        TRACKING.title,
        adjustedTitleSize
      );

      // Decorative line (only show if city is shown)
      const lineLength = width * 0.15;
      const decoLineWidth = adjustedTitleSize * 0.02;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = decoLineWidth;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo((width - lineLength) / 2, height * TEXT_POSITIONS.decorativeLine);
      ctx.lineTo((width + lineLength) / 2, height * TEXT_POSITIONS.decorativeLine);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Country (only if showCountry is true)
    if (showCountry) {
      ctx.font = `${FONT_WEIGHTS.subtitle} ${scaledFonts.subtitle}px ${fontStack}`;
      drawTextWithTracking(
        ctx,
        formatDisplayText(countryLabel || country),
        width / 2,
        height * TEXT_POSITIONS.subtitle,
        TRACKING.subtitle,
        scaledFonts.subtitle
      );
    }

    // Coordinates (only if showCoordinates is true)
    if (showCoordinates) {
      ctx.globalAlpha = 0.7;
      ctx.font = `${FONT_WEIGHTS.coords} ${scaledFonts.coords}px ${fontStack}`;
      drawTextWithTracking(
        ctx,
        formatCoordinates(latitude, longitude),
        width / 2,
        height * TEXT_POSITIONS.coords,
        TRACKING.coords,
        scaledFonts.coords
      );
      ctx.globalAlpha = 1;
    }

    if (onExportReady) {
      onExportReady(canvas);
    }
  }, [
    streets,
    railways,
    aeroways,
    coastlines,
    forests,
    water,
    parks,
    theme,
    city,
    country,
    countryLabel,
    latitude,
    longitude,
    fontSize,
    fontFamily,
    config.customTextColor,
    customRoadColor,
    customBackgroundColor,
    showCoordinates,
    showCountry,
    layerVisibility,
    canvasWidth,
    canvasHeight,
    getCropLimits,
    toCanvasCoords,
    getStreetColor,
    getStreetWidth,
    adjustColor,
    onExportReady,
  ]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  // Mouse event handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    // Scale movement by container size to canvas size ratio
    const container = containerRef.current;
    if (container) {
      const scaleX = canvasWidth / container.clientWidth;
      const scaleY = canvasHeight / container.clientHeight;
      setPanOffset(prev => ({
        x: prev.x + dx * scaleX,
        y: prev.y + dy * scaleY,
      }));
    }
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning, canvasWidth, canvasHeight, containerRef]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel handler for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(prev * zoomFactor, 4)));
  }, []);

  // Dynamic aspect ratio style
  const aspectStyle = {
    aspectRatio: `${ratioWidth} / ${ratioHeight}`,
    backgroundColor: theme.bg,
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={aspectStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      onDragStart={(e) => e.preventDefault()}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        style={{ objectFit: 'contain' }} 
      />

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-foreground z-30">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none">
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
