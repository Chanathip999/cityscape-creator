import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PosterConfig, ASPECT_RATIOS, ExportFormat, ExportResolution } from '@/types/poster';
import { useRenderPoster, svgToPng, downloadBlob } from './useRenderPoster';
import { toast } from '@/hooks/use-toast';

const BASE_EXPORT_WIDTH = 1920;
const EXPORT_MULTIPLIERS: Record<ExportResolution, number> = {
  fullhd: 1,
  '4k': 2,
  '8k': 4,
};

interface UsePaymentDownloadResult {
  verifyAndDownload: (
    sessionId: string,
    config: PosterConfig,
    format: ExportFormat,
    resolution: ExportResolution
  ) => Promise<boolean>;
}

export const usePaymentDownload = (): UsePaymentDownloadResult => {
  const { renderPoster } = useRenderPoster();

  const verifyAndDownload = useCallback(
    async (
      sessionId: string,
      config: PosterConfig,
      format: ExportFormat,
      resolution: ExportResolution
    ): Promise<boolean> => {
      try {
        // Verify payment
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (error) {
          throw new Error(error.message || 'Fehler bei der Zahlungsverifizierung');
        }

        if (!data?.isPaid) {
          throw new Error('Zahlung nicht abgeschlossen');
        }

        toast({
          title: 'Zahlung erfolgreich!',
          description: 'Dein Poster wird jetzt generiert...',
        });

        // Calculate dimensions
        const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === config.aspectRatio);
        const ratioWidth = aspectRatioConfig?.width || 3;
        const ratioHeight = aspectRatioConfig?.height || 4;
        const multiplier = EXPORT_MULTIPLIERS[resolution] || 1;
        const exportWidth = BASE_EXPORT_WIDTH * multiplier;
        const exportHeight = Math.round(exportWidth * (ratioHeight / ratioWidth));

        // Render poster
        const svg = await renderPoster(config, exportWidth, exportHeight);

        const fileName = `${config.city.toLowerCase().replace(/\s+/g, '-')}-${config.aspectRatio.replace(':', 'x')}-${resolution}`;

        if (format === 'png') {
          const blob = await svgToPng(svg, exportWidth, exportHeight);
          downloadBlob(blob, `${fileName}.png`);
        } else {
          // JPEG conversion
          const pngBlob = await svgToPng(svg, exportWidth, exportHeight);
          const img = new window.Image();
          const url = URL.createObjectURL(pngBlob);

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = exportWidth;
              canvas.height = exportHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
              }
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, exportWidth, exportHeight);
              ctx.drawImage(img, 0, 0);

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    downloadBlob(blob, `${fileName}.jpg`);
                    resolve();
                  } else {
                    reject(new Error('Could not create JPEG'));
                  }
                },
                'image/jpeg',
                0.95
              );
            };
            img.onerror = () => reject(new Error('Could not load image'));
            img.src = url;
          });

          URL.revokeObjectURL(url);
        }

        toast({
          title: 'Download erfolgreich!',
          description: `${config.city} Poster wurde als ${format.toUpperCase()} gespeichert.`,
        });

        return true;
      } catch (error) {
        console.error('Payment download failed:', error);
        toast({
          title: 'Fehler',
          description: error instanceof Error ? error.message : 'Download fehlgeschlagen',
          variant: 'destructive',
        });
        return false;
      }
    },
    [renderPoster]
  );

  return { verifyAndDownload };
};
