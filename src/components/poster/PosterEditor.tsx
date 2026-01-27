import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PosterConfig, DEFAULT_CONFIG, POSTER_THEMES, PosterTheme } from '@/types/poster';
import { CanvasPosterPreview } from './CanvasPosterPreview';
import { TextOverlay } from './TextOverlay';
import { ThemeSelector } from './ThemeSelector';
import { CitySearch } from './CitySearch';
import { ZoomControls } from './ZoomControls';
import { AIPromptInput } from './AIPromptInput';
import { SettingsTabs } from './SettingsTabs';
import { ClearCacheButton } from './ClearCacheButton';
import { ExportDialog } from './ExportDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Map } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PosterEditorProps {
  onConfigChange?: (config: PosterConfig) => void;
}

export const PosterEditor = ({ onConfigChange }: PosterEditorProps) => {
  const [config, setConfig] = useState<PosterConfig>(DEFAULT_CONFIG);
  const posterRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 533 });

  const handleCitySelect = (city: string, country: string, lat: number, lon: number) => {
    setConfig((prev) => {
      const newConfig = { ...prev, city, country, latitude: lat, longitude: lon };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  };

  const handleThemeChange = (theme: PosterTheme) => {
    setConfig((prev) => {
      const newConfig = { ...prev, theme };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  };

  const handleDistanceChange = (distance: number) => {
    setConfig((prev) => {
      const newConfig = { ...prev, distance };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  };

  // Handle map center change when user pans the map
  const handleMapCenterChange = (lat: number, lng: number) => {
    setConfig((prev) => {
      const newConfig = { ...prev, latitude: lat, longitude: lng };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  };

  // Update container size when poster ref changes
  const updateContainerSize = useCallback(() => {
    if (posterRef.current) {
      setContainerSize({
        width: posterRef.current.clientWidth,
        height: posterRef.current.clientHeight,
      });
    }
  }, []);

  // Observe container size changes
  useState(() => {
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  });

  const handleConfigUpdate = (updates: Partial<PosterConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      
      if (updates.theme && typeof updates.theme === 'object' && 'id' in updates.theme) {
        const foundTheme = POSTER_THEMES.find(t => t.id === updates.theme?.id);
        if (foundTheme) {
          newConfig.theme = foundTheme;
        }
      }
      
      onConfigChange?.(newConfig);
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
            <ExportDialog config={config} posterRef={posterRef} />
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
                    className="h-12"
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
                    className="h-12"
                  />
                </div>
              </div>

              <Separator />

              {/* Theme Selector */}
              <ThemeSelector
                selectedTheme={config.theme}
                onThemeChange={handleThemeChange}
              />

              {/* Settings Tabs */}
              <SettingsTabs config={config} onConfigUpdate={handleConfigUpdate} />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  💡 Vektor-Modus: Stilisierte Straßen als scharfe Vektorgrafik.
                </p>
                <ClearCacheButton />
              </div>
            </motion.div>
          </div>

          {/* Right: Poster Preview */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-lg mx-auto relative"
              ref={(el) => {
                if (el) {
                  // @ts-ignore - using ref callback to update size
                  posterRef.current = el;
                  setTimeout(updateContainerSize, 100);
                }
              }}
            >
              <CanvasPosterPreview 
                config={config} 
                containerRef={posterRef} 
                onMapCenterChange={handleMapCenterChange}
              />
              
              {/* Text Overlay for interactive editing */}
              <TextOverlay
                config={config}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                onConfigUpdate={handleConfigUpdate}
              />
              
              {/* Zoom Controls overlay */}
              <ZoomControls
                distance={config.distance}
                onDistanceChange={handleDistanceChange}
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
