import { useState } from 'react';
import { motion } from 'framer-motion';
import { PosterConfig, DEFAULT_CONFIG, POSTER_THEMES, PosterTheme } from '@/types/poster';
import { PosterPreview } from './PosterPreview';
import { ThemeSelector } from './ThemeSelector';
import { CitySearch } from './CitySearch';
import { DistanceSlider } from './DistanceSlider';
import { MapPreview } from './MapPreview';
import { AIChat } from './AIChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings2, Map, Sparkles, Download } from 'lucide-react';

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
          <Button variant="default" className="gap-2">
            <Download className="w-4 h-4" />
            Export Poster
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="space-y-6">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Manual</span>
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-2">
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">AI</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-6 mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <CitySearch onCitySelect={handleCitySelect} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City Name</Label>
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
                      <Label htmlFor="country">Country</Label>
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
                    <Label htmlFor="countryLabel">Custom Country Label (optional)</Label>
                    <Input
                      id="countryLabel"
                      value={config.countryLabel || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, countryLabel: e.target.value }))
                      }
                      placeholder="e.g., Deutschland"
                    />
                  </div>

                  <ThemeSelector
                    selectedTheme={config.theme}
                    onThemeChange={handleThemeChange}
                  />

                  <DistanceSlider
                    distance={config.distance}
                    onDistanceChange={handleDistanceChange}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="map" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <p className="text-sm text-muted-foreground">
                    Drag the map to position your poster. The dashed circle shows the visible area.
                  </p>
                  <MapPreview
                    latitude={config.latitude}
                    longitude={config.longitude}
                    distance={config.distance}
                    theme={config.theme}
                    onLocationChange={handleLocationChange}
                  />
                  <DistanceSlider
                    distance={config.distance}
                    onDistanceChange={handleDistanceChange}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="ai" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AIChat config={config} onConfigUpdate={handleConfigUpdate} />
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Poster Preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-md mx-auto"
            >
              <PosterPreview config={config} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
