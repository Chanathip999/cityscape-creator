import { RenderMode, RENDER_MODES } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Map, Pencil } from 'lucide-react';

interface RenderModeSelectorProps {
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
}

export const RenderModeSelector = ({
  renderMode,
  onRenderModeChange,
}: RenderModeSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Kartenstil</Label>
      <RadioGroup
        value={renderMode}
        onValueChange={(value) => onRenderModeChange(value as RenderMode)}
        className="grid grid-cols-2 gap-3"
      >
        {RENDER_MODES.map((mode) => (
          <div key={mode.id}>
            <RadioGroupItem
              value={mode.id}
              id={`render-${mode.id}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`render-${mode.id}`}
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
            >
              {mode.id === 'tiles' ? (
                <Map className="mb-2 h-5 w-5" />
              ) : (
                <Pencil className="mb-2 h-5 w-5" />
              )}
              <span className="font-medium">{mode.name}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {mode.description}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};
