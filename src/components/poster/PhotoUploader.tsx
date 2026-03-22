import { useRef, useState } from 'react';
import exifr from 'exifr';
import { PhotoExifData } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, MapPin, Clock, Aperture } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface PhotoUploaderProps {
  photoDataUrl?: string;
  exifData?: PhotoExifData;
  onPhotoChange: (dataUrl: string | undefined, exif: PhotoExifData | undefined) => void;
}

export const PhotoUploader = ({ photoDataUrl, exifData, onPhotoChange }: PhotoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useLanguage();

  const extractExif = async (file: File): Promise<PhotoExifData> => {
    try {
      const raw = await exifr.parse(file, {
        gps: true,
        exif: true,
        pick: [
          'Make', 'Model', 'LensModel', 'FocalLength', 'FNumber',
          'ExposureTime', 'ISO', 'DateTimeOriginal', 'ImageWidth', 'ImageHeight',
          'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude',
        ],
      });

      if (!raw) return {};

      const data: PhotoExifData = {};

      if (raw.latitude && raw.longitude) {
        data.latitude = raw.latitude;
        data.longitude = raw.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${raw.latitude}&lon=${raw.longitude}&format=json&zoom=10`
          );
          const geo = await res.json();
          if (geo.address) {
            const city = geo.address.city || geo.address.town || geo.address.village || '';
            const country = geo.address.country || '';
            data.location = [city, country].filter(Boolean).join(', ');
          }
        } catch { /* ignore */ }
      }

      const make = raw.Make || '';
      const model = raw.Model || '';
      if (make || model) {
        data.camera = model.startsWith(make) ? model : [make, model].filter(Boolean).join(' ');
      }

      if (raw.LensModel) data.lens = raw.LensModel;
      if (raw.FocalLength) data.focalLength = `${Math.round(raw.FocalLength)}mm`;
      if (raw.FNumber) data.aperture = `f/${raw.FNumber}`;
      if (raw.ExposureTime) {
        data.shutterSpeed = raw.ExposureTime >= 1
          ? `${raw.ExposureTime}s`
          : `1/${Math.round(1 / raw.ExposureTime)}s`;
      }
      if (raw.ISO) data.iso = `ISO ${raw.ISO}`;
      if (raw.DateTimeOriginal) {
        const d = new Date(raw.DateTimeOriginal);
        data.dateTime = d.toLocaleDateString(undefined, {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      }

      return data;
    } catch {
      return {};
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      toast.error(t('photo.onlyImages' as any) || 'Please upload image files only');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t('photo.tooLarge' as any) || 'Image too large (max. 20MB)');
      return;
    }

    setIsProcessing(true);

    try {
      const exif = await extractExif(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onPhotoChange(dataUrl, exif);
        toast.success(t('photo.uploaded' as any) || 'Photo uploaded');
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t('photo.uploadError' as any) || 'Upload failed');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    onPhotoChange(undefined, undefined);
  };

  return (
    <div className="space-y-4">
      {!photoDataUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center gap-3"
        >
          <Camera className="w-10 h-10 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t('photo.upload' as any) || 'Upload Photo'}</span>
          <span className="text-xs text-muted-foreground">{t('photo.uploadHint' as any) || 'JPG, PNG, HEIC — EXIF data will be extracted automatically'}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden">
            <img src={photoDataUrl} alt="Uploaded" className="w-full h-32 object-cover" />
            <Button
              variant="destructive"
              size="icon"
              onClick={removePhoto}
              className="absolute top-2 right-2 h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {exifData && (
            <div className="space-y-2 text-xs">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('photo.metadata' as any) || 'Extracted Metadata'}
              </Label>
              <div className="grid grid-cols-1 gap-1.5 bg-muted/50 rounded-lg p-3">
                {exifData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{exifData.location}</span>
                  </div>
                )}
                {exifData.camera && (
                  <div className="flex items-center gap-2">
                    <Camera className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{exifData.camera}</span>
                  </div>
                )}
                {exifData.dateTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{exifData.dateTime}</span>
                  </div>
                )}
                {(exifData.focalLength || exifData.aperture || exifData.iso) && (
                  <div className="flex items-center gap-2">
                    <Aperture className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span>{[exifData.focalLength, exifData.aperture, exifData.shutterSpeed, exifData.iso].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
                {!exifData.location && !exifData.camera && !exifData.dateTime && (
                  <span className="text-muted-foreground italic">{t('photo.noMetadata' as any) || 'No metadata found'}</span>
                )}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('photo.replace' as any) || 'Replace Photo'}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />
    </div>
  );
};
