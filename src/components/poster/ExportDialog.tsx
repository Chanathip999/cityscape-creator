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
  EXPORT_FORMATS,
  EXPORT_RESOLUTIONS,
  PosterConfig,
  ASPECT_RATIOS,
} from '@/types/poster';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { useRenderPoster, svgToPng, downloadBlob } from '@/hooks/useRenderPoster';

interface ExportDialogProps {
  config: PosterConfig;
  posterRef: React.RefObject<HTMLDivElement>;
}

// Base width for Full HD export
const BASE_EXPORT_WIDTH = 1920;

// Browser canvas limits
const MAX_CANVAS_DIMENSION = 16000;
const MAX_CANVAS_PIXELS = 16000 * 16000;

export const ExportDialog = ({ config, posterRef }: ExportDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>('4k');
  const [open, setOpen] = useState(false);
  
  const { renderPoster, isRendering } = useRenderPoster();

  const handleExport = async () => {
    if (isExporting || !posterRef.current) return;

    setIsExporting(true);

    try {
      const element = posterRef.current;
      if (!element) {
        throw new Error('Poster element not found');
      }

      // Get aspect ratio dimensions
      const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === config.aspectRatio);
      const ratioWidth = aspectRatioConfig?.width || 3;
      const ratioHeight = aspectRatioConfig?.height || 4;

      // Calculate export dimensions based on resolution
      const resolutionConfig = EXPORT_RESOLUTIONS.find((r) => r.id === resolution);
      const multiplier = resolutionConfig?.multiplier || 1;

      const exportWidth = BASE_EXPORT_WIDTH * multiplier;
      const exportHeight = Math.round(exportWidth * (ratioHeight / ratioWidth));

      const fileName = `${config.city.toLowerCase().replace(/\s+/g, '-')}-${config.aspectRatio.replace(':', 'x')}-${resolution}`;

      if (config.renderMode === 'vector') {
        // Vector mode: Use backend rendering for perfect quality
        toast({
          title: 'Rendering...',
          description: 'Das Poster wird serverseitig gerendert...',
        });

        const svg = await renderPoster(config, exportWidth, exportHeight);
        
        if (format === 'png') {
          // Convert SVG to PNG
          const blob = await svgToPng(svg, exportWidth, exportHeight);
          downloadBlob(blob, `${fileName}.png`);
        } else {
          // For JPEG, also convert via canvas
          const pngBlob = await svgToPng(svg, exportWidth, exportHeight);
          // Create a canvas from the PNG and export as JPEG
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
              
              canvas.toBlob((blob) => {
                if (blob) {
                  downloadBlob(blob, `${fileName}.jpg`);
                  resolve();
                } else {
                  reject(new Error('Could not create JPEG'));
                }
              }, 'image/jpeg', 0.95);
            };
            img.onerror = () => reject(new Error('Could not load image'));
            img.src = url;
          });
          
          URL.revokeObjectURL(url);
        }

        toast({
          title: 'Export erfolgreich',
          description: `${config.city} Poster wurde als ${format.toUpperCase()} (${resolutionConfig?.description}, ${Math.round(exportWidth)}x${Math.round(exportHeight)}px) gespeichert.`,
        });

        setOpen(false);
        return;
      }

      // Tile mode: Use html2canvas (existing logic)
      let finalCanvas: HTMLCanvasElement;

      // Check if we're using local canvas
      const existingCanvas = element.querySelector('canvas');
      
      if (existingCanvas) {
        // Use the canvas directly for sharp export
        const sourceCanvas = existingCanvas as HTMLCanvasElement;
        
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = exportWidth;
        finalCanvas.height = exportHeight;
        const ctx = finalCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, exportWidth, exportHeight);
      } else {
        // Wait for map tiles to fully load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const currentWidth = element.offsetWidth;
        const baseScale = exportWidth / currentWidth;
        const requestedExtraSharpness = 4;

        const predictedW = element.offsetWidth * baseScale * requestedExtraSharpness;
        const predictedH = element.offsetHeight * baseScale * requestedExtraSharpness;

        const capByDim = Math.min(
          MAX_CANVAS_DIMENSION / Math.max(1, predictedW),
          MAX_CANVAS_DIMENSION / Math.max(1, predictedH)
        );
        const capByPixels = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, predictedW * predictedH));
        const safetyCap = Math.min(1, capByDim, capByPixels);

        const scale = baseScale * requestedExtraSharpness * safetyCap;

        const canvas = await html2canvas(element, {
          scale: scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          width: element.offsetWidth,
          height: element.offsetHeight,
          imageTimeout: 60000,
          onclone: (_clonedDoc, clonedElement) => {
            const mapContainer = clonedElement.querySelector('.leaflet-container');
            if (mapContainer) {
              (mapContainer as HTMLElement).style.visibility = 'visible';
            }
          },
        });

        finalCanvas = document.createElement('canvas');
        finalCanvas.width = exportWidth;
        finalCanvas.height = exportHeight;
        const ctx = finalCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, exportWidth, exportHeight);
      }

      // Get format settings
      const formatConfig = EXPORT_FORMATS.find((f) => f.id === format);
      const mimeType = formatConfig?.mimeType || 'image/png';
      const quality = format === 'jpeg' ? 0.95 : 1.0;

      // Create download link
      const link = document.createElement('a');
      link.download = `${fileName}.${format}`;
      link.href = finalCanvas.toDataURL(mimeType, quality);
      link.click();

      toast({
        title: 'Export erfolgreich',
        description: `${config.city} Poster wurde als ${format.toUpperCase()} (${resolutionConfig?.description}, ${Math.round(exportWidth)}x${Math.round(exportHeight)}px) gespeichert.`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = isExporting || isRendering;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Download className="w-4 h-4" />
          Export Poster
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

          {/* Resolution Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Auflösung</Label>
            <RadioGroup
              value={resolution}
              onValueChange={(value) => setResolution(value as ExportResolution)}
              className="grid grid-cols-3 gap-3"
            >
              {EXPORT_RESOLUTIONS.map((res) => (
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
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Info about render mode */}
          <p className="text-xs text-muted-foreground">
            💡 {config.renderMode === 'vector' 
              ? 'Vektor-Modus: Poster wird serverseitig gerendert für perfekte Qualität.'
              : 'Tile-Modus: Karten-Tiles werden gerastert. Für beste Qualität Full HD oder 4K wählen.'}
          </p>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {config.renderMode === 'vector' ? 'Rendere...' : 'Exportiere...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download {format.toUpperCase()} ({EXPORT_RESOLUTIONS.find(r => r.id === resolution)?.name})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
