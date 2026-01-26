import { AspectRatioId, ASPECT_RATIOS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AspectRatioSelectorProps {
  aspectRatio: AspectRatioId;
  onAspectRatioChange: (aspectRatio: AspectRatioId) => void;
}

export const AspectRatioSelector = ({
  aspectRatio,
  onAspectRatioChange,
}: AspectRatioSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label>Seitenverhältnis</Label>
      <Select
        value={aspectRatio}
        onValueChange={(value) => onAspectRatioChange(value as AspectRatioId)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Format wählen" />
        </SelectTrigger>
        <SelectContent>
          {ASPECT_RATIOS.map((ratio) => (
            <SelectItem key={ratio.id} value={ratio.id}>
              <div className="flex items-center gap-3">
                <div
                  className="border border-muted-foreground/30 bg-muted/50"
                  style={{
                    width: ratio.width > ratio.height ? 24 : Math.round(24 * (ratio.width / ratio.height)),
                    height: ratio.height > ratio.width ? 24 : Math.round(24 * (ratio.height / ratio.width)),
                  }}
                />
                <span className="font-medium">{ratio.id}</span>
                <span className="text-muted-foreground text-sm">({ratio.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
