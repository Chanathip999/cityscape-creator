import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AspectRatioId, ASPECT_RATIOS } from '@/types/poster';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface AspectRatioSelectorProps {
  aspectRatio: AspectRatioId;
  onAspectRatioChange: (ratio: AspectRatioId) => void;
}

const QUICK_RATIOS: AspectRatioId[] = ['3:4', '4:3', '9:16', '16:9', '1:1'];

export const AspectRatioSelector = ({ aspectRatio, onAspectRatioChange }: AspectRatioSelectorProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t('format.label')}</Label>
      <div className="flex gap-2">
        {QUICK_RATIOS.map((ratioId) => {
          const ratio = ASPECT_RATIOS.find(r => r.id === ratioId);
          if (!ratio) return null;
          return (
            <button
              key={ratioId}
              onClick={() => onAspectRatioChange(ratioId)}
              className={cn(
                'relative flex-1 aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all',
                aspectRatio === ratioId ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              )}
            >
              {aspectRatio === ratioId && <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />}
              <div className="bg-muted-foreground/30 rounded-sm" style={{
                width: ratio.width > ratio.height ? '60%' : `${(ratio.width / ratio.height) * 60}%`,
                height: ratio.height > ratio.width ? '60%' : `${(ratio.height / ratio.width) * 60}%`,
              }} />
              <span className="text-xs text-muted-foreground">{ratioId}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
