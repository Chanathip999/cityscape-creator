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

interface ExportDialogProps {
  config: PosterConfig;
  posterRef: React.RefObject<HTMLDivElement>;
}

// Base width for Full HD export
const BASE_EXPORT_WIDTH = 1920;

export const ExportDialog = ({ config, posterRef }: ExportDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>('4k');
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    if (isExporting || !posterRef.current) return;

    setIsExporting(true);

    try {
      // Wait for map tiles to fully load
      await new Promise((resolve) => setTimeout(resolve, 1500));

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

      // Calculate scale factor - use higher scale for sharper output
      const currentWidth = element.offsetWidth;
      const scale = (exportWidth / currentWidth) * 1.5; // Extra 1.5x for sharper tiles

      // Use html2canvas to capture the element with maximum quality
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        imageTimeout: 30000, // Longer timeout for tile loading
        onclone: (_clonedDoc, clonedElement) => {
          // Ensure map tiles are fully visible in clone
          const mapContainer = clonedElement.querySelector('.leaflet-container');
          if (mapContainer) {
            (mapContainer as HTMLElement).style.visibility = 'visible';
          }
        },
      });

      // Create final canvas at target resolution
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = exportWidth;
      finalCanvas.height = exportHeight;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Enable high-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw scaled canvas to final size
      ctx.drawImage(canvas, 0, 0, exportWidth, exportHeight);

      // Get format settings
      const formatConfig = EXPORT_FORMATS.find((f) => f.id === format);
      const mimeType = formatConfig?.mimeType || 'image/png';
      const quality = format === 'jpeg' ? 0.95 : 1.0;

      // Create download link
      const link = document.createElement('a');
      const fileName = `${config.city.toLowerCase().replace(/\s+/g, '-')}-${config.aspectRatio.replace(':', 'x')}-${resolution}`;
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
        description: 'Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

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

          {/* Info about map tiles */}
          <p className="text-xs text-muted-foreground">
            💡 Hinweis: Die Karten-Tiles sind Rasterbilder. Für beste Qualität Full HD oder 4K wählen.
          </p>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full gap-2"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportiere...
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
