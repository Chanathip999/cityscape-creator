import { useState } from 'react';
import { PosterConfig, FontFamily, FontSize, LayerVisibility, FONT_FAMILIES, FONT_SIZES, AspectRatioId, ASPECT_RATIOS, TextPosition, TEXT_POSITIONS_OPTIONS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Palette, Move, Check, Waves, Trees, TreeDeciduous, Train, Plane, MapPin, Blend } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsTabsProps {
  config: PosterConfig;
  onConfigUpdate: (updates: Partial<PosterConfig>) => void;
}

type TabId = 'text' | 'colors' | 'layers';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'colors', label: 'Farben', icon: Palette },
  { id: 'layers', label: 'Ebenen', icon: Move },
];

const LAYER_OPTIONS: { id: keyof LayerVisibility; label: string; icon: React.ElementType }[] = [
  { id: 'water', label: 'Wasser', icon: Waves },
  { id: 'forests', label: 'Wälder', icon: Trees },
  { id: 'parks', label: 'Parks', icon: TreeDeciduous },
  { id: 'railways', label: 'Zugstrecken', icon: Train },
  { id: 'aeroways', label: 'Flughäfen', icon: Plane },
  { id: 'coastlines', label: 'Küstenlinien', icon: MapPin },
];

// Common aspect ratios for quick selection
const QUICK_RATIOS: AspectRatioId[] = ['3:4', '4:3', '9:16', '16:9', '1:1'];

export const SettingsTabs = ({ config, onConfigUpdate }: SettingsTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('text');

  const handleLayerToggle = (layerId: keyof LayerVisibility) => {
    onConfigUpdate({
      layerVisibility: {
        ...config.layerVisibility,
        [layerId]: !config.layerVisibility[layerId],
      },
    });
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

            {/* Font Size */}
            <div className="space-y-2">
              <Label>Schriftgröße</Label>
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

            {/* Road Color */}
            <div className="space-y-2">
              <Label>Straßenfarbe</Label>
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
                  placeholder="#FFFFFF"
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
            {/* Layer Toggles */}
            <div className="space-y-2">
              {LAYER_OPTIONS.map(({ id, label, icon: Icon }) => (
                <div key={id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-normal">{label}</Label>
                  </div>
                  <Switch
                    checked={config.layerVisibility[id]}
                    onCheckedChange={() => handleLayerToggle(id)}
                  />
                </div>
              ))}
            </div>

            {/* Format/Aspect Ratio */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label>Format</Label>
              <div className="flex gap-2">
                {QUICK_RATIOS.map((ratioId) => {
                  const ratio = ASPECT_RATIOS.find(r => r.id === ratioId);
                  if (!ratio) return null;
                  
                  return (
                    <button
                      key={ratioId}
                      onClick={() => onConfigUpdate({ aspectRatio: ratioId })}
                      className={cn(
                        'relative flex-1 aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all',
                        config.aspectRatio === ratioId
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {config.aspectRatio === ratioId && (
                        <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />
                      )}
                      <div 
                        className="bg-muted-foreground/30 rounded-sm"
                        style={{
                          width: ratio.width > ratio.height ? '60%' : `${(ratio.width / ratio.height) * 60}%`,
                          height: ratio.height > ratio.width ? '60%' : `${(ratio.height / ratio.width) * 60}%`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{ratioId}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
