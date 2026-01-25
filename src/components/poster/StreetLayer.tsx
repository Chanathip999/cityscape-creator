import { useEffect, useRef } from 'react';
import { PosterTheme } from '@/types/poster';
import { StreetSegment } from '@/hooks/useStreetData';

interface StreetLayerProps {
  streets: StreetSegment[];
  theme: PosterTheme;
  mapInstance: any; // Leaflet map instance
}

// Line widths for each street type (thicker lines for cleaner look)
const STREET_WIDTHS: Record<string, number> = {
  motorway: 4,
  primary: 3,
  secondary: 2.5,
};

export const StreetLayer = ({ streets, theme, mapInstance }: StreetLayerProps) => {
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstance || !streets.length) return;

    const drawStreets = async () => {
      const L = await import('leaflet');

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
        const weight = STREET_WIDTHS[streetType.type] || 1;

        for (const polyline of streetType.coordinates) {
          if (polyline.length < 2) continue;

          const line = L.polyline(polyline, {
            color,
            weight,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
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
    default:
      return theme.roadResidential;
  }
}
