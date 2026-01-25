import { useEffect, useRef } from 'react';
import { PosterTheme } from '@/types/poster';
import { StreetSegment } from '@/hooks/useStreetData';

interface StreetLayerProps {
  streets: StreetSegment[];
  theme: PosterTheme;
  mapInstance: any; // Leaflet map instance
}

// Line widths for each street type - ultra-fine like osmnx/matplotlib vector output
const STREET_WIDTHS: Record<string, number> = {
  motorway: 1.8,
  primary: 1.2,
  secondary: 0.8,
  tertiary: 0.5,
  residential: 0.3,
  service: 0.2,
};

// Opacity per street type for depth effect (smaller streets more subtle)
const STREET_OPACITY: Record<string, number> = {
  motorway: 1,
  primary: 0.95,
  secondary: 0.85,
  tertiary: 0.75,
  residential: 0.65,
  service: 0.5,
};

export const StreetLayer = ({ streets, theme, mapInstance }: StreetLayerProps) => {
  const layerGroupRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance || !streets.length) return;

    const drawStreets = async () => {
      const L = await import('leaflet');

      // Use canvas renderer for much better pan performance with many segments
      if (!rendererRef.current) {
        rendererRef.current = L.canvas({ padding: 0.5 });
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
        const weight = STREET_WIDTHS[streetType.type] || 0.3;
        const opacity = STREET_OPACITY[streetType.type] || 0.6;

        for (const polyline of streetType.coordinates) {
          if (polyline.length < 2) continue;

          const line = L.polyline(polyline, {
            color,
            weight,
            opacity,
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

// Get street color from theme
function getStreetColor(type: string, theme: PosterTheme): string {
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
    case 'service':
      return theme.roadService;
    default:
      return theme.roadService;
  }
}
