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
  PosterConfig,
  ASPECT_RATIOS,
} from '@/types/poster';
import { toast } from '@/hooks/use-toast';

interface ExportDialogProps {
  config: PosterConfig;
  posterRef: React.RefObject<HTMLDivElement>;
}

// Pricing per resolution
const RESOLUTION_PRICES: Record<ExportResolution, number> = {
  fullhd: 9.99,
  '4k': 14.99,
  '8k': 24.99,
};

const RESOLUTION_OPTIONS = [
  { id: 'fullhd' as ExportResolution, name: 'Full HD', description: '1920px', price: 9.99 },
  { id: '4k' as ExportResolution, name: '4K', description: '3840px', price: 14.99 },
  { id: '8k' as ExportResolution, name: '8K', description: '7680px', price: 24.99 },
];

export const ExportDialog = ({ config, posterRef }: ExportDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>('fullhd');
  const [open, setOpen] = useState(false);

  const currentPrice = RESOLUTION_PRICES[resolution];

  const handlePurchase = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // TODO: Stripe integration - currently disabled
      toast({
        title: 'Zahlung noch nicht aktiviert',
        description: 'Die Stripe-Integration wird noch eingerichtet. Bitte versuche es später erneut.',
      });
      
      // Stripe redirect is disabled for now
      // The integration will be enabled once the API key is configured
      
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Fehler',
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
  const resolutionConfig = RESOLUTION_OPTIONS.find((r) => r.id === resolution);
  const multiplier = resolution === 'fullhd' ? 1 : resolution === '4k' ? 2 : 4;
  const exportWidth = 1920 * multiplier;
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

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird vorbereitet...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download {format.toUpperCase()} ({resolution.toUpperCase()}) – €{currentPrice.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
