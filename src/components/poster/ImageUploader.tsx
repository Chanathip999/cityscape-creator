import { useRef } from 'react';
import { MapImage } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ImageUploaderProps {
  images: MapImage[];
  onImagesChange: (images: MapImage[]) => void;
  mapCenter: { lat: number; lng: number };
}

export const ImageUploader = ({ images, onImagesChange, mapCenter }: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) { toast.error(t('overlays.onlyImages')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('overlays.imageTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const newImage: MapImage = {
          id: `img-${Date.now()}`, dataUrl,
          lat: mapCenter.lat, lng: mapCenter.lng,
          width: 0.1, height: 0.1 / aspectRatio, rotation: 0, opacity: 1,
        };
        onImagesChange([...images, newImage]);
        toast.success(t('overlays.imageAdded'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => { onImagesChange(images.filter(img => img.id !== id)); };
  const updateImage = (id: string, updates: Partial<MapImage>) => {
    onImagesChange(images.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium flex items-center gap-2">
        <ImagePlus className="w-4 h-4" />{t('overlays.images')}
      </Label>
      <div onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center gap-2">
        <Upload className="w-8 h-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t('overlays.uploadImage')}</span>
        <span className="text-[10px] text-muted-foreground">{t('overlays.uploadHint')}</span>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      {images.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">{t('overlays.uploadedImages')} ({images.length})</Label>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {images.map((image) => (
              <div key={image.id} className="p-2 rounded bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <img src={image.dataUrl} alt="Uploaded" className="w-10 h-10 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">Image #{image.id.split('-')[1]}</div>
                    <div className="text-[10px] text-muted-foreground">{Math.round(image.opacity! * 100)}% {t('overlays.imageOpacity')}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeImage(image.id)} className="h-6 w-6 p-0 flex-shrink-0">
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t('overlays.imageSize')}</span><span>{Math.round(image.width * 100)}%</span>
                  </div>
                  <Slider value={[image.width * 100]} min={5} max={50} step={1}
                    onValueChange={([value]) => updateImage(image.id, { width: value / 100, height: (value / 100) * (image.height / image.width) })} className="w-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t('overlays.imageOpacity')}</span><span>{Math.round((image.opacity || 1) * 100)}%</span>
                  </div>
                  <Slider value={[(image.opacity || 1) * 100]} min={10} max={100} step={5}
                    onValueChange={([value]) => updateImage(image.id, { opacity: value / 100 })} className="w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{t('overlays.imagePlaceHint')}</p>
    </div>
  );
};
