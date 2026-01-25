import { Slider } from '@/components/ui/slider';

interface DistanceSliderProps {
  distance: number;
  onDistanceChange: (distance: number) => void;
}

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

export const DistanceSlider = ({ distance, onDistanceChange }: DistanceSliderProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Map Radius</label>
        <span className="text-sm text-muted-foreground font-mono">
          {formatDistance(distance)}
        </span>
      </div>
      <Slider
        value={[distance]}
        onValueChange={(value) => onDistanceChange(value[0])}
        min={2000}
        max={30000}
        step={500}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Close-up</span>
        <span>Wide view</span>
      </div>
    </div>
  );
};
