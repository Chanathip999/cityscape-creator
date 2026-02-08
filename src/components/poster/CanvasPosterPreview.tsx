/**
 * Canvas-based Poster Preview for Minimalist (Vector) mode.
 * 
 * IMPORTANT: This component's rendering logic is based on the maptoposter Python script:
 * https://github.com/Chanathip999/maptoposter/blob/main/create_map_poster.py
 * 
 * When modifying this component, always refer to the original Python implementation
 * to ensure visual parity with the reference output.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { PosterConfig, ASPECT_RATIOS, TEXT_LAYOUT_STYLES, MapIconType } from '@/types/poster';
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

// SVG path data for map icons (simplified versions)
const ICON_PATHS: Record<MapIconType, string> = {
  pin: 'M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  plane: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  train: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4z',
  car: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z',
  bike: 'M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z',
  bus: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z',
  ship: 'M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2z',
  helicopter: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  parking: 'M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm.2 8H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2z',
  fuel: 'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77z',
  restaurant: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  cafe: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM2 21h18v-2H2v2z',
  hotel: 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z',
  hospital: 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
  church: 'M18 12.22V9l-5-2.5V5h2V3h-2V1h-2v2H9v2h2v1.5L6 9v3.22L4 13v9h7v-5h2v5h7v-9l-2-.78z',
  monument: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z',
  castle: 'M21 9V7l-2 1V6l-2-1V3H7v2L5 6v2L3 7v2l2 1v9H3v2h18v-2h-2v-9l2-1zM8 19H5v-6h3v6zm5 0h-3v-6h3v6zm5 0h-3v-6h3v6z',
  stadium: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z',
  university: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
  school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
  library: 'M12 11.55C9.64 9.35 6.48 8 3 8v11c3.48 0 6.64 1.35 9 3.55 2.36-2.19 5.52-3.55 9-3.55V8c-3.48 0-6.64 1.35-9 3.55z',
  museum: 'M22 11V9L12 2 2 9v2h2v9H2v2h20v-2h-2v-9h2zm-6 9h-3v-5h-2v5H8v-7h8v7z',
};

interface CanvasPosterPreviewProps {
  config: PosterConfig;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  onMapCenterChange?: (lat: number, lng: number) => void;
  onIconMove?: (iconId: string, lat: number, lng: number) => void;
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

// NOTE: Export is rendered server-side (render-poster). The interactive preview should be
// FAST, so we render at the container's pixel size (with devicePixelRatio) instead of 300DPI.

// Prevent right-click context menu to protect poster content
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  return false;
};

export const CanvasPosterPreview = ({ config, onExportReady, containerRef: externalContainerRef, onMapCenterChange, onIconMove }: CanvasPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;

  // Container pixel size (drives preview canvas resolution)
  const [containerPx, setContainerPx] = useState({ width: 800, height: 1000 });

  // Pan/Zoom state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingIcon, setDraggingIcon] = useState<string | null>(null);
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
    fontSizeScale = 1,
    aspectRatio,
    layerVisibility,
    layerColors = {},
    customRoadColor,
    customMotorwayColor,
    customBackgroundColor,
    showCoordinates,
    showCountry,
    showCity,
    showGradients,
    textPosition,
    textLayoutStyle = 'classic',
    mapIcons = [],
    mapImages = [],
    mapRoutes = [],
  } = config;

  // Get text layout style configuration
  const textStyle = useMemo(() => 
    TEXT_LAYOUT_STYLES.find(s => s.id === textLayoutStyle) || TEXT_LAYOUT_STYLES[0],
    [textLayoutStyle]
  );

  // Load images for overlay rendering
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  
  useEffect(() => {
    const loadImages = async () => {
      const newImages: Record<string, HTMLImageElement> = {};
      for (const mapImage of mapImages) {
        if (!loadedImages[mapImage.id]) {
          const img = new Image();
          img.src = mapImage.dataUrl;
          await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
          newImages[mapImage.id] = img;
        }
      }
      if (Object.keys(newImages).length > 0) {
        setLoadedImages(prev => ({ ...prev, ...newImages }));
      }
    };
    loadImages();
  }, [mapImages]);

  // Get text positions based on textPosition setting
  const TEXT_POSITIONS = getTextPositions(textPosition);

  // Get aspect ratio dimensions
  const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === aspectRatio) || ASPECT_RATIOS[1];
  const ratioWidth = aspectRatioConfig.width;
  const ratioHeight = aspectRatioConfig.height;
  const aspectValue = ratioWidth / ratioHeight;

  // Track container size (ResizeObserver) so preview renders at screen resolution.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      setContainerPx((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef]);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasWidth = Math.max(1, Math.round(containerPx.width * dpr));
  const canvasHeight = Math.max(1, Math.round(containerPx.height * dpr));

  // Calculate compensated distance for data fetching
  const compensatedDistance = Math.ceil(
    distance * (Math.max(ratioHeight, ratioWidth) / Math.min(ratioHeight, ratioWidth)) / 4
  );
  // Fetch a bit beyond the crop to allow panning without constantly re-fetching.
  // Too high increases tile count and backend load.
  // Keep some margin for panning, but avoid over-fetching (tile explosion = slow).
  const fetchDistance = Math.max(distance, compensatedDistance) * 1.2;

  const { streets, railways, aeroways, coastlines, water, parks, forests, buildings, isLoading, error } = useStreetData({
    latitude,
    longitude,
    distance: fetchDistance,
    enabled: true,
    includeBuildings: layerVisibility.buildings,
    layerVisibility,
  });

  // Reset pan/zoom when location or aspect ratio changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
  }, [latitude, longitude, aspectRatio]);

  const getStreetColor = useCallback(
    (type: string): string => {
      // Motorways use custom motorway color if set
      if (['motorway', 'motorway_link'].includes(type)) {
        return customMotorwayColor || theme.roadMotorway;
      }
      
      // Other roads use custom road color if set
      if (customRoadColor) {
        return customRoadColor;
      }
      
      if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(type)) {
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
    [theme, customRoadColor, customMotorwayColor]
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

    // Ensure the internal buffer matches current container size.
    // (CSS size is handled by w-full/h-full on the canvas element.)
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
      const coastlineColor = layerColors.coastlines || theme.water;
      ctx.strokeStyle = coastlineColor;
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
      const waterColor = layerColors.water || theme.water;
      ctx.fillStyle = waterColor;
      ctx.strokeStyle = waterColor;
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
      // Use custom forest color or derive from parks color
      const forestColor = layerColors.forests || adjustColor(theme.parks, -20, 10);
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
      const parksColor = layerColors.parks || theme.parks;
      ctx.fillStyle = parksColor;
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
      const aerowaysColor = layerColors.aeroways || theme.roadService || '#666666';
      ctx.strokeStyle = aerowaysColor;
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
      const railwayColor = layerColors.railways || theme.railway || theme.text;
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
    // (moved up - buildings will be drawn AFTER streets to avoid obscuring them)
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

    // z=4: Draw buildings AFTER streets (so streets remain visible on top)
    if (layerVisibility.buildings && buildings && buildings.length > 0) {
      const buildingColor = layerColors.buildings || '#555555';
      ctx.fillStyle = buildingColor;
      ctx.globalAlpha = 0.6; // Semi-transparent so streets show through
      
      for (const polygon of buildings) {
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
      ctx.globalAlpha = 1.0; // Reset alpha
    }

    // z=5: Draw custom routes
    if (mapRoutes && mapRoutes.length > 0) {
      for (const route of mapRoutes) {
        if (route.routePoints && route.routePoints.length >= 2) {
          ctx.strokeStyle = route.color || '#E53935';
          ctx.lineWidth = Math.max(2, 4 * (width / 864) * (route.width || 1));
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          const start = toCanvasCoords(route.routePoints[0][0], route.routePoints[0][1], width, height, bounds);
          ctx.moveTo(start.x, start.y);
          
          for (let i = 1; i < route.routePoints.length; i++) {
            const point = toCanvasCoords(route.routePoints[i][0], route.routePoints[i][1], width, height, bounds);
            ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
        } else if (route.startLat && route.startLng && route.endLat && route.endLng) {
          // Fallback: draw straight line if no route points
          ctx.strokeStyle = route.color || '#E53935';
          ctx.lineWidth = Math.max(2, 4 * (width / 864) * (route.width || 1));
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          const start = toCanvasCoords(route.startLat, route.startLng, width, height, bounds);
          const end = toCanvasCoords(route.endLat, route.endLng, width, height, bounds);
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }
    }

    // z=6: Draw custom images
    if (mapImages && mapImages.length > 0) {
      for (const mapImage of mapImages) {
        const img = loadedImages[mapImage.id];
        if (!img || !img.complete) continue;
        
        const pos = toCanvasCoords(mapImage.lat, mapImage.lng, width, height, bounds);
        const imgWidth = width * mapImage.width;
        const imgHeight = height * mapImage.height;
        
        ctx.save();
        ctx.globalAlpha = mapImage.opacity || 1;
        if (mapImage.rotation) {
          ctx.translate(pos.x, pos.y);
          ctx.rotate((mapImage.rotation * Math.PI) / 180);
          ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        } else {
          ctx.drawImage(img, pos.x - imgWidth / 2, pos.y - imgHeight / 2, imgWidth, imgHeight);
        }
        ctx.restore();
      }
    }

    // z=7: Draw custom icons
    if (mapIcons && mapIcons.length > 0) {
      for (const icon of mapIcons) {
        const pos = toCanvasCoords(icon.lat, icon.lng, width, height, bounds);
        const iconSize = Math.max(16, 24 * (width / 864) * (icon.size || 1));
        const iconPath = ICON_PATHS[icon.type];
        
        if (iconPath) {
          ctx.save();
          ctx.translate(pos.x - iconSize / 2, pos.y - iconSize / 2);
          ctx.scale(iconSize / 24, iconSize / 24);
          
          const path = new Path2D(iconPath);
          ctx.fillStyle = icon.color || '#E53935';
          ctx.fill(path);
          ctx.restore();
        }
        
        // Draw label if present
        if (icon.label) {
          const labelSize = Math.max(10, 12 * (width / 864));
          ctx.font = `${labelSize}px sans-serif`;
          ctx.fillStyle = icon.color || '#E53935';
          ctx.textAlign = 'center';
          ctx.fillText(icon.label, pos.x, pos.y + iconSize / 2 + labelSize);
        }
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

    // z=11: Typography - ONLY render if textOverrides is NOT set (TextOverlay handles it otherwise)
    // This prevents double-rendering/overlap
    if (!config.textOverrides || Object.keys(config.textOverrides).length === 0) {
      const textColor = config.customTextColor || theme.text;
      const fontStack = FONT_STACKS[fontFamily];
      const baseFonts = getScaledFontSizes(height, fontSize);
      const scaledFonts = {
        title: baseFonts.title * fontSizeScale,
        subtitle: baseFonts.subtitle * fontSizeScale,
        coords: baseFonts.coords * fontSizeScale,
        attribution: baseFonts.attribution,
      };

      // Apply text alignment based on style
      const textAlign = textStyle.textAlign;
      const xPos = textAlign === 'left' ? width * 0.08 : textAlign === 'right' ? width * 0.92 : width / 2;
      
      ctx.fillStyle = textColor;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';

      // City name with dynamic size adjustment
      if (showCity) {
        const cityCharCount = city.length;
        let adjustedTitleSize = scaledFonts.title;
        if (cityCharCount > 10) {
          const lengthFactor = 10 / cityCharCount;
          adjustedTitleSize = Math.max(adjustedTitleSize * lengthFactor, 20 * (height / 1000));
        }

        // Apply uppercase based on style
        const cityText = textStyle.cityUppercase ? formatDisplayText(city) : city;
        ctx.font = `${FONT_WEIGHTS.title} ${adjustedTitleSize}px ${fontStack}`;
        
        if (textAlign === 'center') {
          drawTextWithTracking(
            ctx,
            cityText,
            xPos,
            height * TEXT_POSITIONS.title,
            TRACKING.title,
            adjustedTitleSize
          );
        } else {
          ctx.fillText(cityText, xPos, height * TEXT_POSITIONS.title);
        }

        // Decorative line - only if style says so
        if (textStyle.showSeparatorLine) {
          const lineLength = width * 0.15;
          const decoLineWidth = adjustedTitleSize * 0.02;
          ctx.strokeStyle = textColor;
          ctx.lineWidth = decoLineWidth;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          if (textAlign === 'center') {
            ctx.moveTo((width - lineLength) / 2, height * TEXT_POSITIONS.decorativeLine);
            ctx.lineTo((width + lineLength) / 2, height * TEXT_POSITIONS.decorativeLine);
          } else if (textAlign === 'left') {
            ctx.moveTo(xPos, height * TEXT_POSITIONS.decorativeLine);
            ctx.lineTo(xPos + lineLength, height * TEXT_POSITIONS.decorativeLine);
          } else {
            ctx.moveTo(xPos - lineLength, height * TEXT_POSITIONS.decorativeLine);
            ctx.lineTo(xPos, height * TEXT_POSITIONS.decorativeLine);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Country
      if (showCountry) {
        const countryText = textStyle.countryUppercase 
          ? formatDisplayText(countryLabel || country) 
          : (countryLabel || country);
        ctx.font = `${FONT_WEIGHTS.subtitle} ${scaledFonts.subtitle}px ${fontStack}`;
        
        if (textAlign === 'center') {
          drawTextWithTracking(
            ctx,
            countryText,
            xPos,
            height * TEXT_POSITIONS.subtitle,
            TRACKING.subtitle,
            scaledFonts.subtitle
          );
        } else {
          ctx.fillText(countryText, xPos, height * TEXT_POSITIONS.subtitle);
        }
      }

      // Coordinates - respect style's coordsStyle setting
      if (showCoordinates && textStyle.coordsStyle !== 'hidden') {
        ctx.globalAlpha = 0.7;
        ctx.font = `${FONT_WEIGHTS.coords} ${scaledFonts.coords}px ${fontStack}`;
        const coordsText = textStyle.coordsStyle === 'compact'
          ? `${latitude.toFixed(4)}°N / ${Math.abs(longitude).toFixed(3)}°${longitude >= 0 ? 'E' : 'W'}`
          : formatCoordinates(latitude, longitude);
        
        if (textAlign === 'center') {
          drawTextWithTracking(
            ctx,
            coordsText,
            xPos,
            height * TEXT_POSITIONS.coords,
            TRACKING.coords,
            scaledFonts.coords
          );
        } else {
          ctx.fillText(coordsText, xPos, height * TEXT_POSITIONS.coords);
        }
        ctx.globalAlpha = 1;
      }
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
    textStyle,
    mapIcons,
    mapImages,
    mapRoutes,
    loadedImages,
  ]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  // Convert screen coords to lat/lng
  const screenToLatLng = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    
    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    const bounds = getCropLimits();
    const lng = bounds.minLng + x * (bounds.maxLng - bounds.minLng);
    const lat = bounds.maxLat - y * (bounds.maxLat - bounds.minLat);
    
    return { lat, lng };
  }, [containerRef, getCropLimits]);

  // Check if click is on an icon
  const getIconAtPosition = useCallback((clientX: number, clientY: number): string | null => {
    const container = containerRef.current;
    if (!container || !mapIcons || mapIcons.length === 0) return null;
    
    const rect = container.getBoundingClientRect();
    const clickX = (clientX - rect.left) / rect.width;
    const clickY = (clientY - rect.top) / rect.height;
    
    const bounds = getCropLimits();
    const hitRadius = 0.03; // 3% of canvas for click detection
    
    for (const icon of mapIcons) {
      const iconX = (icon.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
      const iconY = 1 - (icon.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
      
      const dist = Math.sqrt((clickX - iconX) ** 2 + (clickY - iconY) ** 2);
      if (dist < hitRadius) {
        return icon.id;
      }
    }
    return null;
  }, [containerRef, getCropLimits, mapIcons]);

  // Mouse event handlers for pan and icon drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const iconId = getIconAtPosition(e.clientX, e.clientY);
    if (iconId && onIconMove) {
      setDraggingIcon(iconId);
      e.preventDefault();
    } else {
      setIsPanning(true);
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [getIconAtPosition, onIconMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingIcon && onIconMove) {
      const coords = screenToLatLng(e.clientX, e.clientY);
      if (coords) {
        onIconMove(draggingIcon, coords.lat, coords.lng);
      }
      return;
    }
    
    if (!isPanning) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
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
  }, [isPanning, draggingIcon, canvasWidth, canvasHeight, containerRef, onIconMove, screenToLatLng]);

  const handleMouseUp = useCallback(() => {
    if (draggingIcon) {
      setDraggingIcon(null);
      return;
    }
    
    if (isPanning && onMapCenterChange) {
      const bounds = getCropLimits();
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      onMapCenterChange(centerLat, centerLng);
    }
    setIsPanning(false);
  }, [isPanning, draggingIcon, onMapCenterChange, getCropLimits]);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setDraggingIcon(null);
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
