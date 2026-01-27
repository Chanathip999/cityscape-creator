import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Loader2, FileImage, Image } from 'lucide-react';
import {
  ExportFormat,
  ExportResolution,
  PosterConfig,
  ASPECT_RATIOS,
} from '@/types/poster';
import { toast } from '@/hooks/use-toast';
import { useRenderPoster, svgToPng, downloadBlob } from '@/hooks/useRenderPoster';

interface ExportDialogProps {
  config: PosterConfig;
  posterRef: React.RefObject<HTMLDivElement>;
}

// Pricing per resolution (for display only, Stripe integration later)
const RESOLUTION_OPTIONS = [
  { id: 'fullhd' as ExportResolution, name: 'Full HD', description: '1920px', price: 9.99, multiplier: 1 },
  { id: '4k' as ExportResolution, name: '4K', description: '3840px', price: 14.99, multiplier: 2 },
  { id: '8k' as ExportResolution, name: '8K', description: '7680px', price: 24.99, multiplier: 4 },
];

export const ExportDialog = ({ config, posterRef }: ExportDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>('fullhd');
  const [open, setOpen] = useState(false);
  
  const { renderPoster } = useRenderPoster();

  const currentResolution = RESOLUTION_OPTIONS.find((r) => r.id === resolution) || RESOLUTION_OPTIONS[0];
  const currentPrice = currentResolution.price;

  const handleDownload = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      toast({
        title: 'Poster wird generiert...',
        description: 'Bitte warte einen Moment.',
      });

      // Calculate dimensions
      const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === config.aspectRatio);
      const ratioWidth = aspectRatioConfig?.width || 3;
      const ratioHeight = aspectRatioConfig?.height || 4;
      const exportWidth = 1920 * currentResolution.multiplier;
      const exportHeight = Math.round(exportWidth * (ratioHeight / ratioWidth));

      // Render poster via backend
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
      
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Fehler beim Export',
        description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate dimensions for preview
  const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === config.aspectRatio);
  const ratioWidth = aspectRatioConfig?.width || 3;
  const ratioHeight = aspectRatioConfig?.height || 4;
  const exportWidth = 1920 * currentResolution.multiplier;
  const exportHeight = Math.round(exportWidth * (ratioHeight / ratioWidth));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Download className="w-4 h-4" />
          <span>Export Poster</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Poster exportieren</DialogTitle>
          <DialogDescription>
            Wähle Format und Auflösung für deinen Download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Dateiformat</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="png"
                  id="format-png"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="format-png"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <FileImage className="mb-3 h-6 w-6" />
                  <span className="font-medium">PNG</span>
                  <span className="text-xs text-muted-foreground">Verlustfrei</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="jpeg"
                  id="format-jpeg"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="format-jpeg"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Image className="mb-3 h-6 w-6" />
                  <span className="font-medium">JPEG</span>
                  <span className="text-xs text-muted-foreground">Komprimiert</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Resolution Selection with Prices */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Auflösung</Label>
            <RadioGroup
              value={resolution}
              onValueChange={(value) => setResolution(value as ExportResolution)}
              className="grid grid-cols-3 gap-3"
            >
              {RESOLUTION_OPTIONS.map((res) => (
                <div key={res.id}>
                  <RadioGroupItem
                    value={res.id}
                    id={`res-${res.id}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`res-${res.id}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <span className="font-medium">{res.name}</span>
                    <span className="text-xs text-muted-foreground">{res.description}</span>
                    <span className="text-sm font-bold text-primary mt-1">€{res.price.toFixed(2)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Summary */}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
            <p>📍 <strong>{config.city}</strong> • Format {config.aspectRatio}</p>
            <p>📐 Auflösung: {exportWidth} × {exportHeight} px</p>
            <p>💾 Vektor-Modus: Poster wird serverseitig gerendert für perfekte Qualität.</p>
          </div>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird generiert...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download {format.toUpperCase()} ({currentResolution.name}) – €{currentPrice.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
