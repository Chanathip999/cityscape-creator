import { useEffect, useRef } from 'react';
import { PosterTheme } from '@/types/poster';
import { StreetSegment } from '@/hooks/useStreetData';

interface StreetLayerProps {
  streets: StreetSegment[];
  theme: PosterTheme;
  mapInstance: any; // Leaflet map instance
}

// IMPORTANT: widths below ~1px tend to look like "bright edges + dark center" on dark backgrounds
// due to antialiasing. Use significantly thicker lines (2-5px) for solid appearance.
const STREET_WIDTHS: Record<string, number> = {
  motorway: 5.0,
  primary: 3.5,
  secondary: 2.5,
  tertiary: 2.0,
  residential: 1.5,
};

// For hybrid mode: only motorway/primary get theme colors, rest gets subtle gray
const HYBRID_STREET_TYPES = ['motorway', 'primary'];

export const StreetLayer = ({ streets, theme, mapInstance }: StreetLayerProps) => {
  const layerGroupRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance || !streets.length) return;

    const drawStreets = async () => {
      const L = await import('leaflet');

      // SVG strokes render more uniformly (no "hollow" antialias look on thin lines).
      // Performance is fine for poster preview; final export is server-side anyway.
      if (!rendererRef.current) {
        rendererRef.current = L.svg({ padding: 0.5 });
      }

      // Remove existing layer group
      if (layerGroupRef.current) {
        mapInstance.removeLayer(layerGroupRef.current);
      }

      // Create new layer group
      const layerGroup = L.layerGroup();

      // Draw streets in reverse order (residential first, motorway last)
      // so motorways are drawn on top
      const orderedStreets = [...streets].reverse();

      for (const streetType of orderedStreets) {
        const color = getStreetColor(streetType.type, theme);
        const weight = Math.max(1.5, STREET_WIDTHS[streetType.type] || 1.5);
        
        console.log(`Rendering ${streetType.type}: ${streetType.coordinates.length} segments, weight: ${weight}px, color: ${color}`);

        for (const polyline of streetType.coordinates) {
          if (polyline.length < 2) continue;

          const line = L.polyline(polyline, {
            color,
            weight,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
            renderer: rendererRef.current,
          });

          layerGroup.addLayer(line);
        }
      }

      layerGroup.addTo(mapInstance);
      layerGroupRef.current = layerGroup;
    };

    drawStreets();

    return () => {
      if (layerGroupRef.current && mapInstance) {
        try {
          mapInstance.removeLayer(layerGroupRef.current);
        } catch (e) {
          // Map might already be destroyed
        }
      }
    };
  }, [streets, theme, mapInstance]);

  return null;
};

// Get street color from theme - HYBRID mode: only major roads get color, rest is subtle gray
function getStreetColor(type: string, theme: PosterTheme): string {
  // Major roads get theme colors (magenta/cyan for neon)
  if (HYBRID_STREET_TYPES.includes(type)) {
    switch (type) {
      case 'motorway':
        return theme.roadMotorway;
      case 'primary':
        return theme.roadPrimary;
      default:
        return theme.roadPrimary;
    }
  }
  
  // All other roads get a subtle monochrome color based on theme
  // For dark themes: light gray/white; for light themes: dark gray
  const isDarkTheme = ['neon', 'noir', 'midnight'].includes(theme.id);
  if (isDarkTheme) {
    // Subtle cyan-ish gray for dark themes (like Thames water effect)
    switch (type) {
      case 'secondary':
        return '#3A5A6A'; // darker cyan-gray
      case 'tertiary':
        return '#2A4A5A'; // even darker
      case 'residential':
        return '#1A3A4A'; // very subtle
      default:
        return '#1A3A4A';
    }
  } else {
    // For light themes: subtle dark grays
    switch (type) {
      case 'secondary':
        return '#8A9AA0';
      case 'tertiary':
        return '#A0B0B5';
      case 'residential':
        return '#B5C5CA';
      default:
        return '#B5C5CA';
    }
  }
}