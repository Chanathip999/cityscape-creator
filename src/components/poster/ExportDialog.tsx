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

// Pricing tiers
type PricingTier = 'budget' | 'fullhd' | '4k' | '8k';

const PRICING_OPTIONS: { id: PricingTier; name: string; description: string; price: number; multiplier: number; hasWatermark: boolean }[] = [
  { id: 'budget', name: 'Budget', description: 'Mit Logo', price: 3.00, multiplier: 1, hasWatermark: true },
  { id: 'fullhd', name: 'Full HD', description: '1920px', price: 9.99, multiplier: 1, hasWatermark: false },
  { id: '4k', name: '4K', description: '3840px', price: 14.99, multiplier: 2, hasWatermark: false },
  { id: '8k', name: '8K', description: '7680px', price: 17.99, multiplier: 4, hasWatermark: false },
];

// Bundle pricing (3 posters) - only for premium tiers
const BUNDLE_PRICING: Record<Exclude<PricingTier, 'budget'>, number> = {
  fullhd: 24.97,
  '4k': 39.97,
  '8k': 49.97,
};

// Building data premium
const BUILDING_PREMIUM = 1.99;

export const ExportDialog = ({ config, posterRef }: ExportDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [pricingTier, setPricingTier] = useState<PricingTier>('fullhd');
  const [quantity, setQuantity] = useState<1 | 3>(1);
  const [open, setOpen] = useState(false);
  
  const { renderPoster } = useRenderPoster();

  const currentPricing = PRICING_OPTIONS.find((r) => r.id === pricingTier) || PRICING_OPTIONS[1];
  
  // Budget tier doesn't support buildings or bundles
  const isBudgetTier = pricingTier === 'budget';
  
  // Buildings only available for 4K and 8K
  const buildingsAvailable = pricingTier === '4k' || pricingTier === '8k';
  const hasBuildings = buildingsAvailable && (config.layerVisibility?.buildings || false);
  
  // Calculate total price
  const buildingSurcharge = hasBuildings ? BUILDING_PREMIUM : 0;
  const basePrice = !isBudgetTier && quantity === 3 
    ? BUNDLE_PRICING[pricingTier as Exclude<PricingTier, 'budget'>] 
    : currentPricing.price;
  const totalPrice = basePrice + buildingSurcharge;

  const handleDownload = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      toast({
        title: 'Poster wird generiert...',
        description: isBudgetTier ? 'Budget-Version mit Logo wird erstellt...' : 'Bitte warte einen Moment.',
      });

      // Calculate dimensions
      const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === config.aspectRatio);
      const ratioWidth = aspectRatioConfig?.width || 3;
      const ratioHeight = aspectRatioConfig?.height || 4;
      const exportWidth = 1920 * currentPricing.multiplier;
      const exportHeight = Math.round(exportWidth * (ratioHeight / ratioWidth));

      // Render poster via backend (with watermark for budget tier)
      const svg = await renderPoster(config, exportWidth, exportHeight, currentPricing.hasWatermark);

      const tierSuffix = isBudgetTier ? 'budget' : pricingTier;
      const fileName = `${config.city.toLowerCase().replace(/\s+/g, '-')}-${config.aspectRatio.replace(':', 'x')}-${tierSuffix}`;

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
  const exportWidth = 1920 * currentPricing.multiplier;
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

          {/* Pricing Tier Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Preisstufe</Label>
            <RadioGroup
              value={pricingTier}
              onValueChange={(value) => {
                setPricingTier(value as PricingTier);
                // Reset quantity to 1 for budget tier
                if (value === 'budget') setQuantity(1);
              }}
              className="grid grid-cols-2 gap-2"
            >
              {PRICING_OPTIONS.map((tier) => (
                <div key={tier.id}>
                  <RadioGroupItem
                    value={tier.id}
                    id={`tier-${tier.id}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`tier-${tier.id}`}
                    className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer relative ${
                      tier.hasWatermark ? 'bg-muted/30' : ''
                    }`}
                  >
                    {tier.hasWatermark && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        GÜNSTIG
                      </span>
                    )}
                    <span className="font-medium text-sm">{tier.name}</span>
                    <span className="text-[10px] text-muted-foreground">{tier.description}</span>
                    <span className="text-sm font-bold text-primary mt-0.5">€{tier.price.toFixed(2)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Budget tier notice */}
          {isBudgetTier && (
            <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 flex items-start gap-2">
              <span className="text-base">🏷️</span>
              <span>Budget-Version enthält ein dezentes "MAPPOSTER" Logo am unteren Rand. Perfekt für den persönlichen Gebrauch!</span>
            </div>
          )}

          {/* Quantity Selection - only for premium tiers */}
          {!isBudgetTier && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Anzahl</Label>
              <RadioGroup
                value={String(quantity)}
                onValueChange={(value) => setQuantity(Number(value) as 1 | 3)}
                className="grid grid-cols-2 gap-3"
              >
                <div>
                  <RadioGroupItem value="1" id="qty-1" className="peer sr-only" />
                  <Label
                    htmlFor="qty-1"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <span className="font-medium">1 Poster</span>
                    <span className="text-sm font-bold text-primary mt-1">€{currentPricing.price.toFixed(2)}</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="3" id="qty-3" className="peer sr-only" />
                  <Label
                    htmlFor="qty-3"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer relative"
                  >
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      SPARE
                    </span>
                    <span className="font-medium">3 Poster</span>
                    <span className="text-sm font-bold text-primary mt-1">
                      €{BUNDLE_PRICING[pricingTier as Exclude<PricingTier, 'budget'>]?.toFixed(2) || '-'}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-through">
                      €{(currentPricing.price * 3).toFixed(2)}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Summary */}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
            <p>📍 <strong>{config.city}</strong> • Format {config.aspectRatio}</p>
            <p>📐 Auflösung: {exportWidth} × {exportHeight} px</p>
            {isBudgetTier && (
              <p className="text-orange-600 dark:text-orange-400 font-medium">🏷️ Mit Logo-Wasserzeichen</p>
            )}
            {hasBuildings && (
              <p className="text-primary font-medium">🏢 Gebäudedaten: +€{BUILDING_PREMIUM.toFixed(2)}</p>
            )}
            {config.layerVisibility?.buildings && !buildingsAvailable && (
              <p className="text-destructive font-medium">⚠️ Gebäudedaten nur ab 4K verfügbar</p>
            )}
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
                Download {isBudgetTier ? '' : `${quantity}x `}{format.toUpperCase()} ({currentPricing.name}) – €{totalPrice.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
