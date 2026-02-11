import { useState } from 'react';
import { MapIcon, MapIconType, MAP_ICON_OPTIONS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  MapPin, Heart, Star, Home, Flag,
  Plane, Train, Car, Bike, Bus,
  Ship, ParkingCircle, Fuel,
  UtensilsCrossed, Coffee, Hotel, Hospital,
  Church, Landmark, Castle, Trophy,
  GraduationCap, School, Library, BookOpen,
  Plus, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface IconSelectorProps {
  icons: MapIcon[];
  onIconsChange: (icons: MapIcon[]) => void;
  mapCenter: { lat: number; lng: number };
}

const ICON_COMPONENTS: Record<MapIconType, React.ElementType> = {
  pin: MapPin, heart: Heart, star: Star, home: Home, flag: Flag,
  plane: Plane, train: Train, car: Car, bike: Bike, bus: Bus,
  ship: Ship, helicopter: Plane, parking: ParkingCircle, fuel: Fuel,
  restaurant: UtensilsCrossed, cafe: Coffee, hotel: Hotel, hospital: Hospital,
  church: Church, monument: Landmark, castle: Castle, stadium: Trophy,
  university: GraduationCap, school: School, library: Library, museum: BookOpen,
};

const POPULAR_ICONS: MapIconType[] = [
  'pin', 'heart', 'star', 'home', 'flag',
  'plane', 'train', 'car', 'restaurant', 'cafe',
  'hotel', 'church', 'monument', 'castle', 'stadium'
];

export const IconSelector = ({ icons, onIconsChange, mapCenter }: IconSelectorProps) => {
  const [selectedIconType, setSelectedIconType] = useState<MapIconType>('pin');
  const [iconColor, setIconColor] = useState('#E53935');
  const [iconLabel, setIconLabel] = useState('');
  const [iconSize, setIconSize] = useState(1);
  const { t } = useLanguage();

  const addIcon = () => {
    const newIcon: MapIcon = {
      id: `icon-${Date.now()}`, type: selectedIconType,
      lat: mapCenter.lat, lng: mapCenter.lng,
      color: iconColor, size: iconSize, label: iconLabel || undefined,
    };
    onIconsChange([...icons, newIcon]);
    setIconLabel('');
  };

  const updateIconSize = (iconId: string, newSize: number) => {
    onIconsChange(icons.map(icon => icon.id === iconId ? { ...icon, size: newSize } : icon));
  };

  const removeIcon = (id: string) => {
    onIconsChange(icons.filter(icon => icon.id !== id));
  };

  const SelectedIconComponent = ICON_COMPONENTS[selectedIconType];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        {t('overlays.icons')}
      </Label>
      <div className="flex flex-wrap gap-1">
        {POPULAR_ICONS.map((iconType) => {
          const IconComp = ICON_COMPONENTS[iconType];
          return (
            <button key={iconType} onClick={() => setSelectedIconType(iconType)}
              title={MAP_ICON_OPTIONS.find(o => o.id === iconType)?.name}
              className={cn('p-1.5 rounded transition-all',
                selectedIconType === iconType ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}>
              <IconComp className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input type="color" value={iconColor} onChange={(e) => setIconColor(e.target.value)}
            className="w-7 h-7 rounded border border-border cursor-pointer" />
          <Input value={iconLabel} onChange={(e) => setIconLabel(e.target.value)}
            placeholder={t('overlays.iconLabel')} className="h-7 text-xs flex-1" />
          <Button size="sm" onClick={addIcon} className="h-7 gap-1 px-2">
            <Plus className="w-3 h-3" /><SelectedIconComponent className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">{t('overlays.iconSize')}:</span>
          <Slider value={[iconSize * 100]} min={50} max={200} step={10}
            onValueChange={([v]) => setIconSize(v / 100)} className="flex-1" />
          <span className="text-xs text-muted-foreground w-8">{Math.round(iconSize * 100)}%</span>
        </div>
      </div>
      {icons.length > 0 && (
        <div className="space-y-1.5">
          {icons.map((icon) => {
            const IconComp = ICON_COMPONENTS[icon.type];
            return (
              <div key={icon.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50 text-xs">
                <IconComp className="w-4 h-4 shrink-0" style={{ color: icon.color }} />
                {icon.label && <span className="text-muted-foreground truncate max-w-16">{icon.label}</span>}
                <Slider value={[(icon.size || 1) * 100]} min={50} max={200} step={10}
                  onValueChange={([v]) => updateIconSize(icon.id, v / 100)} className="flex-1 min-w-20" />
                <span className="text-muted-foreground w-8 text-right">{Math.round((icon.size || 1) * 100)}%</span>
                <button onClick={() => removeIcon(icon.id)} className="shrink-0 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{t('overlays.iconDragHint')}</p>
    </div>
  );
};
