import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZoomControlsProps {
  distance: number;
  onDistanceChange: (distance: number) => void;
  minDistance?: number;
  maxDistance?: number;
  step?: number;
}

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

export const ZoomControls = ({
  distance,
  onDistanceChange,
  minDistance = 2000,
  maxDistance = 30000,
  step = 1000,
}: ZoomControlsProps) => {
  const handleZoomIn = () => {
    const newDistance = Math.max(minDistance, distance - step);
    onDistanceChange(newDistance);
  };

  const handleZoomOut = () => {
    const newDistance = Math.min(maxDistance, distance + step);
    onDistanceChange(newDistance);
  };

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
      <Button
        variant="secondary"
        size="icon"
        onClick={handleZoomIn}
        disabled={distance <= minDistance}
        className="h-9 w-9 rounded-lg bg-background/90 backdrop-blur-sm border border-border hover:bg-background shadow-md"
        title="Zoom in (weniger Radius)"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <div className="text-[10px] text-center text-muted-foreground font-mono bg-background/90 backdrop-blur-sm rounded px-1 py-0.5 border border-border">
        {formatDistance(distance)}
      </div>
      <Button
        variant="secondary"
        size="icon"
        onClick={handleZoomOut}
        disabled={distance >= maxDistance}
        className="h-9 w-9 rounded-lg bg-background/90 backdrop-blur-sm border border-border hover:bg-background shadow-md"
        title="Zoom out (mehr Radius)"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
};
