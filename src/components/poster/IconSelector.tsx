import { useState } from 'react';
import { MapIcon, MapIconType, MAP_ICON_OPTIONS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, Heart, Star, Home, Flag,
  Plane, Train, Car, Bike, Bus,
  Ship, ParkingCircle, Fuel,
  UtensilsCrossed, Coffee, Hotel, Hospital,
  Church, Landmark, Castle, Trophy,
  GraduationCap, School, Library, BookOpen,
  Plus, X, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconSelectorProps {
  icons: MapIcon[];
  onIconsChange: (icons: MapIcon[]) => void;
  mapCenter: { lat: number; lng: number };
}

// Icon component mapping
const ICON_COMPONENTS: Record<MapIconType, React.ElementType> = {
  pin: MapPin,
  heart: Heart,
  star: Star,
  home: Home,
  flag: Flag,
  plane: Plane,
  train: Train,
  car: Car,
  bike: Bike,
  bus: Bus,
  ship: Ship,
  helicopter: Plane, // Using Plane as fallback
  parking: ParkingCircle,
  fuel: Fuel,
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  hotel: Hotel,
  hospital: Hospital,
  church: Church,
  monument: Landmark,
  castle: Castle,
  stadium: Trophy,
  university: GraduationCap,
  school: School,
  library: Library,
  museum: BookOpen,
};

// Group icons by category
const groupedIcons = MAP_ICON_OPTIONS.reduce((acc, icon) => {
  if (!acc[icon.category]) {
    acc[icon.category] = [];
  }
  acc[icon.category].push(icon);
  return acc;
}, {} as Record<string, typeof MAP_ICON_OPTIONS>);

export const IconSelector = ({ icons, onIconsChange, mapCenter }: IconSelectorProps) => {
  const [selectedIconType, setSelectedIconType] = useState<MapIconType>('pin');
  const [iconColor, setIconColor] = useState('#E53935');
  const [iconLabel, setIconLabel] = useState('');

  const addIcon = () => {
    const newIcon: MapIcon = {
      id: `icon-${Date.now()}`,
      type: selectedIconType,
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      color: iconColor,
      size: 1,
      label: iconLabel || undefined,
    };
    onIconsChange([...icons, newIcon]);
    setIconLabel('');
  };

  const removeIcon = (id: string) => {
    onIconsChange(icons.filter(icon => icon.id !== id));
  };

  const SelectedIconComponent = ICON_COMPONENTS[selectedIconType];

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Karten-Icons
      </Label>
      
      {/* Icon type selector */}
      <ScrollArea className="h-[180px] rounded-md border p-2">
        <div className="space-y-3">
          {Object.entries(groupedIcons).map(([category, categoryIcons]) => (
            <div key={category}>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                {category}
              </div>
              <div className="flex flex-wrap gap-1">
                {categoryIcons.map((iconOption) => {
                  const IconComp = ICON_COMPONENTS[iconOption.id];
                  return (
                    <button
                      key={iconOption.id}
                      onClick={() => setSelectedIconType(iconOption.id)}
                      title={iconOption.name}
                      className={cn(
                        'p-1.5 rounded-md transition-all',
                        selectedIconType === iconOption.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Icon customization */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={iconColor}
            onChange={(e) => setIconColor(e.target.value)}
            className="w-8 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={iconLabel}
            onChange={(e) => setIconLabel(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 text-xs flex-1"
          />
        </div>
        <Button size="sm" onClick={addIcon} className="h-8 gap-1">
          <Plus className="w-3 h-3" />
          <SelectedIconComponent className="w-4 h-4" />
        </Button>
      </div>

      {/* Active icons list */}
      {icons.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Aktive Icons ({icons.length})</Label>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {icons.map((icon) => {
              const IconComp = ICON_COMPONENTS[icon.type];
              return (
                <div
                  key={icon.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <IconComp className="w-4 h-4" style={{ color: icon.color }} />
                    <span className="text-xs">
                      {MAP_ICON_OPTIONS.find(o => o.id === icon.type)?.name}
                      {icon.label && <span className="text-muted-foreground ml-1">({icon.label})</span>}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIcon(icon.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Icons werden in der Kartenmitte platziert. Verschieben durch Drag & Drop.
      </p>
    </div>
  );
};
