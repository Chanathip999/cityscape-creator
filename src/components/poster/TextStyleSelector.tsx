import { TextLayoutStyle, TEXT_LAYOUT_STYLES } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TextStyleSelectorProps {
  selectedStyle: TextLayoutStyle;
  onStyleChange: (style: TextLayoutStyle) => void;
}

export const TextStyleSelector = ({ selectedStyle, onStyleChange }: TextStyleSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Text-Stil</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {TEXT_LAYOUT_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id;
          
          return (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              title={style.description}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {/* Mini preview */}
              <div className={cn(
                'w-full aspect-[3/4] rounded bg-muted flex flex-col justify-end p-1 relative overflow-hidden text-[4px]',
                style.textAlign === 'left' ? 'items-start' : 'items-center'
              )}>
                {/* Street lines decoration */}
                <div className="absolute inset-0 opacity-15">
                  <div className="absolute top-1/4 left-0 right-0 h-px bg-foreground rotate-12" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-foreground -rotate-6" />
                </div>
                
                {/* Text preview */}
                <div className={cn(
                  'relative z-10 space-y-px',
                  style.textAlign === 'left' ? 'text-left pl-0.5' : 'text-center'
                )}>
                  <div className={cn(
                    'font-bold leading-none',
                    style.cityUppercase ? 'uppercase' : ''
                  )}>
                    CITY
                  </div>
                  {style.showSeparatorLine && (
                    <div className="w-3 h-px bg-foreground/60 mx-auto" />
                  )}
                  <div className="text-[3px] text-muted-foreground leading-none">
                    Country
                  </div>
                </div>
              </div>
              
              <span className="text-[10px] font-medium truncate w-full text-center">
                {style.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
