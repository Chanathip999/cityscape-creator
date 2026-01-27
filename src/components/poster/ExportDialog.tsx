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
import { Download, Loader2, FileImage, Image, CreditCard, Euro } from 'lucide-react';
import {
  ExportFormat,
  ExportResolution,
  EXPORT_FORMATS,
  EXPORT_RESOLUTIONS,
  PosterConfig,
  ASPECT_RATIOS,
} from '@/types/poster';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExportDialogProps {
  config: PosterConfig;
  posterRef: React.RefObject<HTMLDivElement>;
}

const POSTER_PRICE = 9.99;

export const ExportDialog = ({ config, posterRef }: ExportDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>('4k');
  const [open, setOpen] = useState(false);

  const handlePurchase = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      toast({
        title: 'Weiterleitung zu Stripe...',
        description: 'Du wirst zur sicheren Zahlungsseite weitergeleitet.',
      });

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          city: config.city,
          aspectRatio: config.aspectRatio,
          successUrl: `${window.location.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}&format=${format}&resolution=${resolution}`,
          cancelUrl: `${window.location.origin}/?payment=cancelled`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Fehler beim Erstellen der Zahlungssitzung');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Keine Checkout-URL erhalten');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
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
  const resolutionConfig = EXPORT_RESOLUTIONS.find((r) => r.id === resolution);
  const multiplier = resolutionConfig?.multiplier || 1;
  const exportWidth = 1920 * multiplier;
  const exportHeight = Math.round(exportWidth * (ratioHeight / ratioWidth));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Download className="w-4 h-4" />
          <span>Poster kaufen</span>
          <span className="font-bold">€{POSTER_PRICE.toFixed(2)}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Poster kaufen & herunterladen
          </DialogTitle>
          <DialogDescription>
            Wähle Format und Auflösung. Nach der Zahlung wird dein Poster automatisch heruntergeladen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Price Display */}
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
              <Euro className="w-6 h-6" />
              <span>{POSTER_PRICE.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Einmaliger Kauf • Sofortiger Download
            </p>
          </div>

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

          {/* Summary */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>📍 <strong>{config.city}</strong> • Format {config.aspectRatio}</p>
            <p>📐 Auflösung: {exportWidth} × {exportHeight} px</p>
            <p>🔒 Sichere Zahlung über Stripe</p>
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
                Wird weitergeleitet...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Jetzt kaufen für €{POSTER_PRICE.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
