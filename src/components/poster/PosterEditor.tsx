import { useState } from 'react';
import { motion } from 'framer-motion';
import { PosterConfig, DEFAULT_CONFIG, POSTER_THEMES, PosterTheme, FontFamily, FontSize, PosterOrientation } from '@/types/poster';
import { PosterPreview } from './PosterPreview';
import { ThemeSelector } from './ThemeSelector';
import { CitySearch } from './CitySearch';
import { DistanceSlider } from './DistanceSlider';
import { AIPromptInput } from './AIPromptInput';
import { FontSelector } from './FontSelector';
import { OrientationToggle } from './OrientationToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Map, Download, Palette } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const PosterEditor = () => {
  const [config, setConfig] = useState<PosterConfig>(DEFAULT_CONFIG);

  const handleCitySelect = (city: string, country: string, lat: number, lon: number) => {
    setConfig((prev) => ({
      ...prev,
      city,
      country,
      latitude: lat,
      longitude: lon,
    }));
  };

  const handleThemeChange = (theme: PosterTheme) => {
    setConfig((prev) => ({
      ...prev,
      theme,
    }));
  };

  const handleDistanceChange = (distance: number) => {
    setConfig((prev) => ({
      ...prev,
      distance,
    }));
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setConfig((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleFontFamilyChange = (fontFamily: FontFamily) => {
    setConfig((prev) => ({ ...prev, fontFamily }));
  };

  const handleFontSizeChange = (fontSize: FontSize) => {
    setConfig((prev) => ({ ...prev, fontSize }));
  };

  const handleTextColorChange = (customTextColor: string | undefined) => {
    setConfig((prev) => ({ ...prev, customTextColor }));
  };

  const handleOrientationChange = (orientation: PosterOrientation) => {
    setConfig((prev) => ({ ...prev, orientation }));
  };

  const handleColoredStreetsChange = (coloredStreets: boolean) => {
    setConfig((prev) => ({ ...prev, coloredStreets }));
  };

  const handleConfigUpdate = (updates: Partial<PosterConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      
      // Handle theme update by ID
      if (updates.theme && typeof updates.theme === 'object' && 'id' in updates.theme) {
        const foundTheme = POSTER_THEMES.find(t => t.id === updates.theme?.id);
        if (foundTheme) {
          newConfig.theme = foundTheme;
        }
      }
      
      return newConfig;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg text-foreground">City Map Poster</h1>
              <p className="text-xs text-muted-foreground">Create beautiful city prints</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="default" className="gap-2">
              <Download className="w-4 h-4" />
              Export Poster
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* City Search */}
              <CitySearch onCitySelect={handleCitySelect} />
              
              {/* City and Country Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Stadtname</Label>
                  <Input
                    id="city"
                    value={config.city}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="City name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={config.country}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, country: e.target.value }))
                    }
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="countryLabel">Alternativer Text (optional)</Label>
                <Input
                  id="countryLabel"
                  value={config.countryLabel || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, countryLabel: e.target.value }))
                  }
                  placeholder="z.B. Deutschland"
                />
              </div>

              <Separator />

              {/* Theme Selector */}
              <ThemeSelector
                selectedTheme={config.theme}
                onThemeChange={handleThemeChange}
              />

              {/* Font Selector */}
              <FontSelector
                fontFamily={config.fontFamily}
                fontSize={config.fontSize}
                customTextColor={config.customTextColor}
                onFontFamilyChange={handleFontFamilyChange}
                onFontSizeChange={handleFontSizeChange}
                onTextColorChange={handleTextColorChange}
              />

              <Separator />

              {/* Orientation Toggle */}
              <OrientationToggle
                orientation={config.orientation}
                onOrientationChange={handleOrientationChange}
              />

              {/* Distance Slider */}
              <DistanceSlider
                distance={config.distance}
                onDistanceChange={handleDistanceChange}
              />

              <Separator />

              {/* Colored Streets Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="colored-streets" className="cursor-pointer">Farbige Straßen</Label>
                    <p className="text-xs text-muted-foreground">Vektor-Straßen in Theme-Farben</p>
                  </div>
                </div>
                <Switch
                  id="colored-streets"
                  checked={config.coloredStreets || false}
                  onCheckedChange={handleColoredStreetsChange}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                💡 Tipp: Du kannst die Karte direkt auf dem Poster ziehen, um sie zu positionieren.
              </p>
            </motion.div>
          </div>

          {/* Right: Interactive Poster Preview */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-lg mx-auto"
            >
              <PosterPreview 
                config={config} 
                onLocationChange={handleLocationChange}
                interactive={true}
              />
            </motion.div>
            
            {/* AI Prompt Input - Below the poster */}
            <div className="max-w-lg mx-auto">
              <AIPromptInput config={config} onConfigUpdate={handleConfigUpdate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
