import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LayerVisibility } from '@/types/poster';
import { 
  Waves, Trees, TreeDeciduous, Train, Plane, MapPin, Building2,
  Route, Footprints, Bike, Mountain, MapPinned, 
  Cable, Home, Landmark, Droplets, Trophy
} from 'lucide-react';

interface LayerToggleSelectorProps {
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (layerVisibility: LayerVisibility) => void;
}

interface LayerOption {
  id: keyof LayerVisibility;
  label: string;
  icon: React.ElementType;
  premium?: boolean;
  premiumPrice?: string;
}

// Core layers (default enabled or commonly used)
const CORE_LAYERS: LayerOption[] = [
  { id: 'water', label: 'Wasser', icon: Waves },
  { id: 'railways', label: 'Zugstrecken', icon: Train },
  { id: 'aeroways', label: 'Flughäfen', icon: Plane },
];

// Geographic layers
const GEOGRAPHIC_LAYERS: LayerOption[] = [
  { id: 'forests', label: 'Wälder', icon: Trees },
  { id: 'parks', label: 'Parks', icon: TreeDeciduous },
  { id: 'coastlines', label: 'Küstenlinien', icon: MapPin },
  { id: 'lakes', label: 'Seen', icon: Droplets },
  { id: 'rivers', label: 'Flüsse', icon: Waves },
];

// Road layers
const ROAD_LAYERS: LayerOption[] = [
  { id: 'mainRoads', label: 'Hauptstraßen', icon: Route },
  { id: 'sideStreets', label: 'Nebenstraßen', icon: Route },
  { id: 'footpaths', label: 'Fußwege', icon: Footprints },
  { id: 'cycleways', label: 'Radwege', icon: Bike },
  { id: 'paths', label: 'Pfade', icon: Mountain },
];

// Transport layers
const TRANSPORT_LAYERS: LayerOption[] = [
  { id: 'trainStations', label: 'Bahnhöfe', icon: MapPinned },
  { id: 'cableways', label: 'Seilbahnen', icon: Cable },
];

// Building layers
const BUILDING_LAYERS: LayerOption[] = [
  { id: 'buildings', label: 'Gebäude', icon: Building2, premium: true, premiumPrice: '+€1,99' },
  { id: 'residentialBuildings', label: 'Wohngebäude', icon: Home },
  { id: 'commercialBuildings', label: 'Gewerbe/Büros', icon: Building2 },
];

// Points of interest
const POI_LAYERS: LayerOption[] = [
  { id: 'monuments', label: 'Denkmäler', icon: Landmark },
  { id: 'stadiums', label: 'Stadien', icon: Trophy },
];

const LAYER_GROUPS = [
  { title: 'Basis', layers: CORE_LAYERS },
  { title: 'Landschaft', layers: GEOGRAPHIC_LAYERS },
  { title: 'Straßen', layers: ROAD_LAYERS },
  { title: 'Transport', layers: TRANSPORT_LAYERS },
  { title: 'Gebäude', layers: BUILDING_LAYERS },
  { title: 'Sehenswürdigkeiten', layers: POI_LAYERS },
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
    <div className="space-y-4">
      <Label className="text-sm font-medium">Kartenebenen</Label>
      
      {LAYER_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">{group.title}</Label>
          <div className="grid grid-cols-2 gap-2">
            {group.layers.map(({ id, label, icon: Icon, premium, premiumPrice }) => (
              <label
                key={id}
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                  premium 
                    ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' 
                    : 'border-border bg-card hover:bg-accent/50'
                }`}
              >
                <Checkbox
                  checked={layerVisibility[id] ?? false}
                  onCheckedChange={() => handleToggle(id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Icon className={`w-4 h-4 ${premium ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm text-foreground flex-1 truncate">{label}</span>
                {premium && premiumPrice && (
                  <Badge variant="secondary" className="text-xs font-semibold bg-primary/20 text-primary border-0">
                    {premiumPrice}
                  </Badge>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
