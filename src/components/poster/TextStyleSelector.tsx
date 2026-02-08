import { TextLayoutStyle, TEXT_LAYOUT_STYLES } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Layout, AlignCenter, AlignLeft, Pen } from 'lucide-react';

interface TextStyleSelectorProps {
  selectedStyle: TextLayoutStyle;
  onStyleChange: (style: TextLayoutStyle) => void;
}

const STYLE_ICONS: Record<TextLayoutStyle, React.ElementType> = {
  classic: Layout,
  modern: AlignCenter,
  minimal: AlignLeft,
  editorial: Pen,
};

export const TextStyleSelector = ({ selectedStyle, onStyleChange }: TextStyleSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Text-Stil</Label>
      <div className="grid grid-cols-2 gap-2">
        {TEXT_LAYOUT_STYLES.map((style) => {
          const Icon = STYLE_ICONS[style.id];
          const isSelected = selectedStyle === style.id;
          
          return (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className={cn(
                'w-full aspect-[3/4] rounded bg-muted flex flex-col items-center justify-end p-2 relative overflow-hidden',
                style.textAlign === 'left' ? 'items-start' : 'items-center'
              )}>
                {/* Preview visualization */}
                <div className="absolute inset-0 opacity-20">
                  {/* Street lines */}
                  <div className="absolute top-1/4 left-0 right-0 h-px bg-foreground rotate-12" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-foreground -rotate-6" />
                  <div className="absolute top-3/4 left-1/4 right-0 h-px bg-foreground rotate-3" />
                </div>
                
                {/* Text preview */}
                <div className={cn(
                  'relative z-10 space-y-0.5',
                  style.textAlign === 'left' ? 'text-left w-full pl-1' : 'text-center'
                )}>
                  <div className={cn(
                    'font-bold text-[8px] leading-tight',
                    style.cityUppercase ? 'uppercase' : ''
                  )}>
                    BERLIN
                  </div>
                  {style.showSeparatorLine && (
                    <div className="w-6 h-px bg-foreground/60 mx-auto my-0.5" />
                  )}
                  <div className={cn(
                    'text-[6px] text-muted-foreground leading-tight',
                    style.countryUppercase ? 'uppercase' : ''
                  )}>
                    Germany
                  </div>
                  {style.coordsStyle !== 'hidden' && (
                    <div className="text-[5px] text-muted-foreground/60 leading-tight">
                      52.52°N
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium">{style.name}</div>
                <div className="text-[10px] text-muted-foreground">{style.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
