import { PosterOrientation } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RectangleVertical, RectangleHorizontal } from 'lucide-react';

interface OrientationToggleProps {
  orientation: PosterOrientation;
  onOrientationChange: (orientation: PosterOrientation) => void;
}

export const OrientationToggle = ({
  orientation,
  onOrientationChange,
}: OrientationToggleProps) => {
  return (
    <div className="space-y-2">
      <Label>Format</Label>
      <ToggleGroup
        type="single"
        value={orientation}
        onValueChange={(value) => {
          if (value) onOrientationChange(value as PosterOrientation);
        }}
        className="justify-start"
      >
        <ToggleGroupItem value="vertical" aria-label="Hochformat" className="gap-2">
          <RectangleVertical className="w-4 h-4" />
          Hochformat
        </ToggleGroupItem>
        <ToggleGroupItem value="horizontal" aria-label="Querformat" className="gap-2">
          <RectangleHorizontal className="w-4 h-4" />
          Querformat
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
