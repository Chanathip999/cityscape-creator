import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LayerVisibility } from '@/types/poster';
import { Waves, Trees, TreeDeciduous, Train, Plane, MapPin, Building2 } from 'lucide-react';

interface LayerToggleSelectorProps {
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (layerVisibility: LayerVisibility) => void;
}

const LAYER_OPTIONS: { id: keyof LayerVisibility; label: string; icon: React.ElementType; premium?: boolean; premiumPrice?: string }[] = [
  { id: 'water', label: 'Wasser', icon: Waves },
  { id: 'forests', label: 'Wälder', icon: Trees },
  { id: 'parks', label: 'Parks', icon: TreeDeciduous },
  { id: 'railways', label: 'Zugstrecken', icon: Train },
  { id: 'aeroways', label: 'Flughäfen', icon: Plane },
  { id: 'coastlines', label: 'Küstenlinien', icon: MapPin },
  { id: 'buildings', label: 'Gebäude', icon: Building2, premium: true, premiumPrice: '+€1,99' },
];

export const LayerToggleSelector = ({
  layerVisibility,
  onLayerVisibilityChange,
}: LayerToggleSelectorProps) => {
  const handleToggle = (layerId: keyof LayerVisibility) => {
    onLayerVisibilityChange({
      ...layerVisibility,
      [layerId]: !layerVisibility[layerId],
    });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Kartenebenen</Label>
      <div className="grid grid-cols-2 gap-2">
        {LAYER_OPTIONS.map(({ id, label, icon: Icon, premium, premiumPrice }) => (
          <label
            key={id}
            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
              premium 
                ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' 
                : 'border-border bg-card hover:bg-accent/50'
            }`}
          >
            <Checkbox
              checked={layerVisibility[id]}
              onCheckedChange={() => handleToggle(id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Icon className={`w-4 h-4 ${premium ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm text-foreground flex-1">{label}</span>
            {premium && premiumPrice && (
              <Badge variant="secondary" className="text-xs font-semibold bg-primary/20 text-primary border-0">
                {premiumPrice}
              </Badge>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};
