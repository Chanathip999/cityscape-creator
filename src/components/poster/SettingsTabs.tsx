import { useState } from 'react';
import { PosterConfig, FontFamily, FontSize, LayerVisibility, LayerColors, FONT_FAMILIES, FONT_SIZES, AspectRatioId, ASPECT_RATIOS, TextPosition, TEXT_POSITIONS_OPTIONS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Type, Palette, Move, Waves, Trees, TreeDeciduous, Train, Plane, MapPin, Blend, Building,
  Route, Footprints, Bike, Mountain, MapPinned, Cable, Home, Landmark, Droplets, Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsTabsProps {
  config: PosterConfig;
  onConfigUpdate: (updates: Partial<PosterConfig>) => void;
}

type TabId = 'text' | 'colors' | 'layers';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'layers', label: 'Ebenen', icon: Move },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'colors', label: 'Farben', icon: Palette },
];

interface LayerOption {
  id: keyof LayerVisibility;
  label: string;
  icon: React.ElementType;
  colorKey: keyof LayerColors;
  premium?: boolean;
  premiumPrice?: string;
}

interface LayerGroup {
  title: string;
  layers: LayerOption[];
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    title: 'Basis',
    layers: [
      { id: 'water', label: 'Wasser', icon: Waves, colorKey: 'water' },
      { id: 'railways', label: 'Zugstrecken', icon: Train, colorKey: 'railways' },
      { id: 'aeroways', label: 'Flughäfen', icon: Plane, colorKey: 'aeroways' },
    ],
  },
  {
    title: 'Landschaft',
    layers: [
      { id: 'parks', label: 'Parks', icon: TreeDeciduous, colorKey: 'parks' },
      { id: 'forests', label: 'Wälder', icon: Trees, colorKey: 'forests' },
      { id: 'coastlines', label: 'Küstenlinien', icon: MapPin, colorKey: 'coastlines' },
      { id: 'lakes', label: 'Seen', icon: Droplets, colorKey: 'lakes' },
      { id: 'rivers', label: 'Flüsse', icon: Waves, colorKey: 'rivers' },
    ],
  },
  {
    title: 'Straßen',
    layers: [
      { id: 'mainRoads', label: 'Hauptstraßen', icon: Route, colorKey: 'mainRoads' },
      { id: 'sideStreets', label: 'Nebenstraßen', icon: Route, colorKey: 'sideStreets' },
      { id: 'footpaths', label: 'Fußwege', icon: Footprints, colorKey: 'footpaths' },
      { id: 'cycleways', label: 'Radwege', icon: Bike, colorKey: 'cycleways' },
      { id: 'paths', label: 'Pfade', icon: Mountain, colorKey: 'paths' },
    ],
  },
  {
    title: 'Transport',
    layers: [
      { id: 'trainStations', label: 'Bahnhöfe', icon: MapPinned, colorKey: 'trainStations' },
      { id: 'cableways', label: 'Seilbahnen', icon: Cable, colorKey: 'cableways' },
    ],
  },
  {
    title: 'Gebäude',
    layers: [
      { id: 'buildings', label: 'Alle Gebäude', icon: Building, colorKey: 'buildings', premium: true, premiumPrice: '+€1,99 (ab 4K)' },
      { id: 'residentialBuildings', label: 'Wohngebäude', icon: Home, colorKey: 'residentialBuildings' },
      { id: 'commercialBuildings', label: 'Gewerbe/Büros', icon: Building, colorKey: 'commercialBuildings' },
    ],
  },
  {
    title: 'Sehenswürdigkeiten',
    layers: [
      { id: 'monuments', label: 'Denkmäler', icon: Landmark, colorKey: 'monuments' },
      { id: 'stadiums', label: 'Stadien', icon: Trophy, colorKey: 'stadiums' },
    ],
  },
];

// Common aspect ratios for quick selection
const QUICK_RATIOS: AspectRatioId[] = ['3:4', '4:3', '9:16', '16:9', '1:1'];

export const SettingsTabs = ({ config, onConfigUpdate }: SettingsTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('layers');

  const handleLayerToggle = (layerId: keyof LayerVisibility) => {
    onConfigUpdate({
      layerVisibility: {
        ...config.layerVisibility,
        [layerId]: !config.layerVisibility[layerId],
      },
    });
  };

  const handleLayerColorChange = (colorKey: keyof LayerColors, color: string) => {
    onConfigUpdate({
      layerColors: {
        ...config.layerColors,
        [colorKey]: color,
      },
    });
  };

  const resetLayerColors = () => {
    onConfigUpdate({ layerColors: {} });
  };

  // Get default color for a layer from theme
  const getLayerDefaultColor = (colorKey: keyof LayerColors): string => {
    switch (colorKey) {
      case 'water': return config.theme.water;
      case 'forests': return config.theme.parks; // forests use parks color darkened
      case 'parks': return config.theme.parks;
      case 'railways': return config.theme.railway || config.theme.text;
      case 'aeroways': return config.theme.roadService || '#666666';
      case 'coastlines': return config.theme.water;
      case 'buildings': return config.theme.roadTertiary;
      default: return '#888888';
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Headers */}
      <div className="flex rounded-lg bg-muted p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'text' && (
          <>
            {/* Font Selector */}
            <div className="space-y-2">
              <Label>Schriftart</Label>
              <Select
                value={config.fontFamily}
                onValueChange={(value) => onConfigUpdate({ fontFamily: value as FontFamily })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size Preset */}
            <div className="space-y-2">
              <Label>Schriftgröße Preset</Label>
              <div className="flex gap-2">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => onConfigUpdate({ fontSize: size.id as FontSize })}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all',
                      config.fontSize === size.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Fine-Tuning Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Feineinstellung</Label>
                <span className="text-sm text-muted-foreground">{Math.round((config.fontSizeScale || 1) * 100)}%</span>
              </div>
              <Slider
                value={[(config.fontSizeScale || 1) * 100]}
                min={50}
                max={200}
                step={5}
                onValueChange={([value]) => onConfigUpdate({ fontSizeScale: value / 100 })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">50% bis 200% des Preset-Werts</p>
            </div>

            {/* Text Position */}
            <div className="space-y-2">
              <Label>Textposition</Label>
              <div className="flex gap-2">
                {TEXT_POSITIONS_OPTIONS.map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => onConfigUpdate({ textPosition: pos.id as TextPosition })}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all',
                      config.textPosition === pos.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {pos.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <Label className="font-normal">Stadtname anzeigen</Label>
                <Switch
                  checked={config.showCity}
                  onCheckedChange={(checked) => onConfigUpdate({ showCity: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label className="font-normal">Land anzeigen</Label>
                <Switch
                  checked={config.showCountry}
                  onCheckedChange={(checked) => onConfigUpdate({ showCountry: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label className="font-normal">Koordinaten anzeigen</Label>
                <Switch
                  checked={config.showCoordinates}
                  onCheckedChange={(checked) => onConfigUpdate({ showCoordinates: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Blend className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-normal">Farbverläufe oben/unten</Label>
                </div>
                <Switch
                  checked={config.showGradients}
                  onCheckedChange={(checked) => onConfigUpdate({ showGradients: checked })}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'colors' && (
          <>
            {/* Text Color */}
            <div className="space-y-2">
              <Label>Textfarbe</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.customTextColor || config.theme.text}
                  onChange={(e) => onConfigUpdate({ customTextColor: e.target.value })}
                  className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={config.customTextColor || config.theme.text}
                  onChange={(e) => onConfigUpdate({ customTextColor: e.target.value })}
                  placeholder="#FFFFFF"
                  className="h-12 flex-1 font-mono"
                />
              </div>
            </div>

            {/* Motorway Color */}
            <div className="space-y-2">
              <Label>Autobahnen / Hauptstraßen</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.customMotorwayColor || config.theme.roadMotorway}
                  onChange={(e) => onConfigUpdate({ customMotorwayColor: e.target.value })}
                  className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={config.customMotorwayColor || config.theme.roadMotorway}
                  onChange={(e) => onConfigUpdate({ customMotorwayColor: e.target.value })}
                  placeholder="#FF00FF"
                  className="h-12 flex-1 font-mono"
                />
              </div>
            </div>

            {/* Other Roads Color */}
            <div className="space-y-2">
              <Label>Nebenstraßen</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.customRoadColor || config.theme.roadPrimary}
                  onChange={(e) => onConfigUpdate({ customRoadColor: e.target.value })}
                  className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={config.customRoadColor || config.theme.roadPrimary}
                  onChange={(e) => onConfigUpdate({ customRoadColor: e.target.value })}
                  placeholder="#00FFFF"
                  className="h-12 flex-1 font-mono"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label>Hintergrund</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.customBackgroundColor || config.theme.bg}
                  onChange={(e) => onConfigUpdate({ customBackgroundColor: e.target.value })}
                  className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={config.customBackgroundColor || config.theme.bg}
                  onChange={(e) => onConfigUpdate({ customBackgroundColor: e.target.value })}
                  placeholder="#000000"
                  className="h-12 flex-1 font-mono"
                />
              </div>
            </div>

            {/* Reset Colors Button */}
            <button
              onClick={() => onConfigUpdate({ 
                customTextColor: undefined, 
                customRoadColor: undefined, 
                customBackgroundColor: undefined 
              })}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Farben zurücksetzen
            </button>
          </>
        )}

        {activeTab === 'layers' && (
          <>
            {/* Grouped Layer Toggles with Color Pickers */}
            <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2">
              {LAYER_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {group.title}
                  </Label>
                  <div className="space-y-2">
                    {group.layers.map(({ id, label, icon: Icon, colorKey, premium, premiumPrice }) => {
                      const isEnabled = config.layerVisibility[id];
                      const customColor = config.layerColors?.[colorKey];
                      const defaultColor = getLayerDefaultColor(colorKey);
                      
                      return (
                        <div key={id} className="space-y-1">
                          <div className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${premium ? 'bg-primary/5' : ''}`}>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-3.5 h-3.5 ${premium ? 'text-primary' : 'text-muted-foreground'}`} />
                              <Label className="font-normal text-sm">{label}</Label>
                              {premium && premiumPrice && (
                                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                  {premiumPrice}
                                </span>
                              )}
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleLayerToggle(id)}
                            />
                          </div>
                          {isEnabled && (
                            <div className="flex items-center gap-2 pl-6">
                              <input
                                type="color"
                                value={customColor || defaultColor}
                                onChange={(e) => handleLayerColorChange(colorKey, e.target.value)}
                                className="w-6 h-6 rounded border border-border cursor-pointer"
                              />
                              <Input
                                value={customColor || defaultColor}
                                onChange={(e) => handleLayerColorChange(colorKey, e.target.value)}
                                placeholder={defaultColor}
                                className="h-7 flex-1 font-mono text-xs"
                              />
                              {customColor && (
                                <button
                                  onClick={() => handleLayerColorChange(colorKey, '')}
                                  className="text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Reset All Layer Colors */}
            <button
              onClick={resetLayerColors}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Alle Ebenenfarben zurücksetzen
            </button>

          </>
        )}
      </div>
    </div>
  );
};
