import { useState, useRef, useEffect, useCallback } from 'react';
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
import { useStreetData } from '@/hooks/useStreetData';

interface ExportDialogProps {
  config: PosterConfig;
  posterRef?: React.RefObject<HTMLDivElement>;
}

// High DPI rendering for print quality
const DPI = 300;
const BASE_SIZE_INCHES = 12;

// Street widths for high-res rendering
const STREET_WIDTHS: Record<string, number> = {
  motorway: 5.0,
  motorway_link: 5.0,
  trunk: 4.0,
  trunk_link: 4.0,
  primary: 4.0,
  primary_link: 4.0,
  secondary: 3.0,
  secondary_link: 3.0,
  tertiary: 2.5,
  tertiary_link: 2.5,
  residential: 2.0,
  living_street: 2.0,
  unclassified: 2.0,
  service: 1.5,
};

const formatCoordinates = (lat: number, lon: number): string => {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lonStr}`;
};

const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join('  ');
};

const createGradientFade = (
  ctx: CanvasRenderingContext2D,
  color: string,
  location: 'top' | 'bottom',
  width: number,
  height: number
) => {
  let gradient: CanvasGradient;
  let yStart: number;
  let fadeHeight: number;

  if (location === 'bottom') {
    yStart = height * 0.75;
    fadeHeight = height * 0.25;
    gradient = ctx.createLinearGradient(0, yStart, 0, height);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
  } else {
    yStart = 0;
    fadeHeight = height * 0.25;
    gradient = ctx.createLinearGradient(0, 0, 0, fadeHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, location === 'top' ? 0 : height * 0.75, width, fadeHeight);
};

export const ExportDialog = ({ config }: ExportDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>('4k');
  const [open, setOpen] = useState(false);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { theme, city, country, countryLabel, latitude, longitude, distance, fontFamily, fontSize, aspectRatio } = config;

  // Get aspect ratio dimensions
  const aspectRatioConfig = ASPECT_RATIOS.find((r) => r.id === aspectRatio) || ASPECT_RATIOS[1];
  const ratioWidth = aspectRatioConfig.width;
  const ratioHeight = aspectRatioConfig.height;
  const aspectValue = ratioWidth / ratioHeight;

  // Calculate compensated distance for data fetching
  const compensatedDistance = Math.ceil(
    distance * (Math.max(ratioHeight, ratioWidth) / Math.min(ratioHeight, ratioWidth)) / 4
  );
  const fetchDistance = Math.max(distance, compensatedDistance) * 1.5;

  // Fetch street data for export
  const { streets, isLoading: streetsLoading } = useStreetData({
    latitude,
    longitude,
    distance: fetchDistance,
    enabled: open, // Only fetch when dialog is open
  });

  const getStreetColor = useCallback(
    (type: string): string => {
      if (['motorway', 'motorway_link'].includes(type)) {
        return theme.roadMotorway;
      } else if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(type)) {
        return theme.roadPrimary;
      } else if (['secondary', 'secondary_link'].includes(type)) {
        return theme.roadSecondary;
      } else if (['tertiary', 'tertiary_link'].includes(type)) {
        return theme.roadTertiary;
      } else if (['residential', 'living_street', 'unclassified'].includes(type)) {
        return theme.roadResidential;
      } else {
        return theme.roadService || theme.roadResidential;
      }
    },
    [theme]
  );

  const getFontFamily = useCallback(() => {
    switch (fontFamily) {
      case 'serif':
        return 'Georgia, "Times New Roman", serif';
      case 'sans':
        return 'Inter, -apple-system, sans-serif';
      case 'display':
        return '"Playfair Display", Georgia, serif';
      case 'elegant':
        return '"Cormorant Garamond", Georgia, serif';
      case 'condensed':
        return 'Oswald, "Arial Narrow", sans-serif';
      default:
        return '"Roboto Mono", "Courier New", monospace';
    }
  }, [fontFamily]);

  const getCropLimits = useCallback(() => {
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos((latitude * Math.PI) / 180);

    let halfX = distance / metersPerDegreeLng;
    let halfY = distance / metersPerDegreeLat;

    if (aspectValue > 1) {
      halfY = halfX / aspectValue;
    } else if (aspectValue < 1) {
      halfX = halfY * aspectValue;
    }

    return {
      minLng: longitude - halfX,
      maxLng: longitude + halfX,
      minLat: latitude - halfY,
      maxLat: latitude + halfY,
    };
  }, [latitude, longitude, distance, aspectValue]);

  const toCanvasCoords = useCallback(
    (
      lat: number,
      lng: number,
      width: number,
      height: number,
      bounds: ReturnType<typeof getCropLimits>
    ) => {
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
      const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
      return { x, y };
    },
    []
  );

  const handleExport = async () => {
    if (isExporting || streetsLoading) return;

    setIsExporting(true);

    try {
      // Get resolution multiplier
      const resolutionConfig = EXPORT_RESOLUTIONS.find((r) => r.id === resolution);
      const multiplier = resolutionConfig?.multiplier || 1;

      // Calculate canvas dimensions based on resolution
      const baseWidth = BASE_SIZE_INCHES * DPI * multiplier;
      const canvasWidth = aspectValue >= 1 
        ? baseWidth 
        : Math.round(baseWidth * aspectValue);
      const canvasHeight = aspectValue >= 1 
        ? Math.round(baseWidth / aspectValue)
        : baseWidth;

      // Create high-resolution canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const bounds = getCropLimits();

      // Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw streets with scaled widths
      const streetOrder = ['residential', 'tertiary', 'secondary', 'primary', 'motorway'];
      const widthScale = multiplier; // Scale line widths based on resolution

      for (const streetType of streetOrder) {
        const segment = streets.find((s) => s.type === streetType);
        if (!segment) continue;

        const color = getStreetColor(streetType);
        const lineWidth = (STREET_WIDTHS[streetType] || 1.5) * widthScale;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const polyline of segment.coordinates) {
          if (polyline.length < 2) continue;

          ctx.beginPath();
          const start = toCanvasCoords(polyline[0][0], polyline[0][1], canvasWidth, canvasHeight, bounds);
          ctx.moveTo(start.x, start.y);

          for (let i = 1; i < polyline.length; i++) {
            const point = toCanvasCoords(polyline[i][0], polyline[i][1], canvasWidth, canvasHeight, bounds);
            ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
        }
      }

      // Gradients
      createGradientFade(ctx, theme.gradientColor, 'top', canvasWidth, canvasHeight);
      createGradientFade(ctx, theme.gradientColor, 'bottom', canvasWidth, canvasHeight);

      // Typography
      const textColor = config.customTextColor || theme.text;
      const scaleFactor = multiplier;

      const BASE_MAIN = 180;
      const BASE_SUB = 66;
      const BASE_COORDS = 42;
      const BASE_ATTR = 24;

      const fontSizeMultiplier = fontSize === 'small' ? 0.8 : fontSize === 'large' ? 1.2 : 1;
      const fontFamilyCSS = getFontFamily();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // City name
      const mainFontSize = BASE_MAIN * scaleFactor * fontSizeMultiplier;
      const cityCharCount = city.length;
      let adjustedMainFontSize = mainFontSize;
      if (cityCharCount > 10) {
        const lengthFactor = 10 / cityCharCount;
        adjustedMainFontSize = Math.max(mainFontSize * lengthFactor, 30 * scaleFactor);
      }

      ctx.font = `bold ${adjustedMainFontSize}px ${fontFamilyCSS}`;
      const cityText = spacedText(city);
      ctx.fillText(cityText, canvasWidth / 2, canvasHeight * 0.86);

      // Country
      const subFontSize = BASE_SUB * scaleFactor * fontSizeMultiplier;
      ctx.font = `300 ${subFontSize}px ${fontFamilyCSS}`;
      ctx.fillText((countryLabel || country).toUpperCase(), canvasWidth / 2, canvasHeight * 0.90);

      // Coordinates
      const coordFontSize = BASE_COORDS * scaleFactor * fontSizeMultiplier;
      ctx.globalAlpha = 0.7;
      ctx.font = `${coordFontSize}px ${fontFamilyCSS}`;
      ctx.fillText(formatCoordinates(latitude, longitude), canvasWidth / 2, canvasHeight * 0.93);
      ctx.globalAlpha = 1;

      // Decorative line
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 3 * scaleFactor;
      ctx.beginPath();
      ctx.moveTo(canvasWidth * 0.4, canvasHeight * 0.875);
      ctx.lineTo(canvasWidth * 0.6, canvasHeight * 0.875);
      ctx.stroke();

      // Attribution
      const attrFontSize = BASE_ATTR * scaleFactor;
      ctx.globalAlpha = 0.5;
      ctx.font = `${attrFontSize}px ${fontFamilyCSS}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('© OpenStreetMap contributors', canvasWidth - 30, canvasHeight - 30);
      ctx.globalAlpha = 1;

      // Get format settings
      const formatConfig = EXPORT_FORMATS.find((f) => f.id === format);
      const mimeType = formatConfig?.mimeType || 'image/png';
      const quality = format === 'jpeg' ? 0.95 : 1.0;

      // Create download link
      const link = document.createElement('a');
      const fileName = `${city.toLowerCase().replace(/\s+/g, '-')}-${aspectRatio.replace(':', 'x')}-${resolution}`;
      link.download = `${fileName}.${format}`;
      link.href = canvas.toDataURL(mimeType, quality);
      link.click();

      toast({
        title: 'Export erfolgreich',
        description: `${city} Poster wurde als ${format.toUpperCase()} (${resolutionConfig?.description}, ${canvasWidth}x${canvasHeight}px) gespeichert.`,
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
            Hochauflösendes Vektor-Poster erstellen (300 DPI, druckbereit)
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

          {/* Loading indicator for street data */}
          {streetsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Lade Straßendaten für Export...
            </div>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting || streetsLoading}
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

          <p className="text-xs text-muted-foreground text-center">
            Vektorbasierter Export mit scharfen Linien bei jeder Auflösung
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
