import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PosterConfig } from '@/types/poster';

interface UseRenderPosterResult {
  renderPoster: (config: PosterConfig, width?: number, height?: number, addWatermark?: boolean) => Promise<string>;
  isRendering: boolean;
  error: string | null;
}

/**
 * Hook to render a poster via the backend edge function.
 * Returns an SVG string that can be displayed or converted to PNG.
 */
export const useRenderPoster = (): UseRenderPosterResult => {
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPoster = useCallback(async (
    config: PosterConfig,
    width: number = 1920,
    height?: number,
    addWatermark: boolean = false
  ): Promise<string> => {
    setIsRendering(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('render-poster', {
        body: {
          city: config.city,
          country: config.countryLabel || config.country,
          latitude: config.latitude,
          longitude: config.longitude,
          distance: config.distance,
          aspectRatio: config.aspectRatio,
          theme: {
            id: config.theme.id,
            bg: config.customBackgroundColor || config.theme.bg,
            text: config.theme.text,
            water: config.layerColors?.water || config.theme.water,
            parks: config.layerColors?.parks || config.theme.parks,
            roadMotorway: config.theme.roadMotorway,
            roadPrimary: config.theme.roadPrimary,
            roadSecondary: config.theme.roadSecondary,
            roadTertiary: config.theme.roadTertiary,
            roadResidential: config.theme.roadResidential,
            roadService: config.theme.roadService,
            railway: config.layerColors?.railways || config.theme.railway,
          },
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          fontSizeScale: config.fontSizeScale || 1.0,
          customTextColor: config.customTextColor,
          customMotorwayColor: config.customMotorwayColor,
          customRoadColor: config.customRoadColor,
          showGradients: config.showGradients,
          showCity: config.showCity,
          showCountry: config.showCountry,
          showCoordinates: config.showCoordinates,
          textPosition: config.textPosition,
          textOverrides: config.textOverrides, // Pass text overrides for custom positions
          // Layer visibility for consistent rendering
          layerVisibility: config.layerVisibility,
          layerColors: config.layerColors,
          addWatermark, // Budget version watermark
          width,
          height,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to render poster');
      }

      // The response is an SVG string
      if (typeof data === 'string') {
        return data;
      }

      // If it's an object with error
      if (data?.error) {
        throw new Error(data.error);
      }

      throw new Error('Unexpected response format');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsRendering(false);
    }
  }, []);

  return { renderPoster, isRendering, error };
};

/**
 * Convert SVG string to PNG blob using canvas.
 */
export async function svgToPng(
  svgString: string,
  width: number,
  height: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    canvas.width = width;
    canvas.height = height;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not convert to PNG'));
        }
      }, 'image/png', 1.0);
    };

    img.onerror = () => {
      reject(new Error('Could not load SVG image'));
    };

    // Convert SVG string to data URL
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
