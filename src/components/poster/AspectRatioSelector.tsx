import { AspectRatioId, ASPECT_RATIOS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Square, RectangleVertical, RectangleHorizontal, Monitor, Smartphone } from 'lucide-react';

interface AspectRatioSelectorProps {
  aspectRatio: AspectRatioId;
  onAspectRatioChange: (aspectRatio: AspectRatioId) => void;
}

const getIcon = (id: AspectRatioId) => {
  switch (id) {
    case '1:1':
      return <Square className="w-4 h-4" />;
    case '3:4':
      return <RectangleVertical className="w-4 h-4" />;
    case '4:3':
      return <RectangleHorizontal className="w-4 h-4" />;
    case '16:9':
      return <Monitor className="w-4 h-4" />;
    case '9:16':
      return <Smartphone className="w-4 h-4" />;
    default:
      return <Square className="w-4 h-4" />;
  }
};

export const AspectRatioSelector = ({
  aspectRatio,
  onAspectRatioChange,
}: AspectRatioSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label>Seitenverhältnis</Label>
      <ToggleGroup
        type="single"
        value={aspectRatio}
        onValueChange={(value) => {
          if (value) onAspectRatioChange(value as AspectRatioId);
        }}
        className="flex flex-wrap justify-start gap-1"
      >
        {ASPECT_RATIOS.map((ratio) => (
          <ToggleGroupItem
            key={ratio.id}
            value={ratio.id}
            aria-label={ratio.name}
            className="gap-2 px-3"
          >
            {getIcon(ratio.id)}
            <span className="text-xs">{ratio.id}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
