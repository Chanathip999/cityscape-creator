import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PosterConfig, DEFAULT_CONFIG, POSTER_THEMES, PosterTheme, AspectRatioId, PosterMode, PhotoExifData, LiveDataOverlay, LiveDataPoint } from '@/types/poster';
import { Maximize2, X, Plane, Ship, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CanvasPosterPreview } from './CanvasPosterPreview';
import { PhotoPosterPreview } from './PhotoPosterPreview';
import { TextOverlay } from './TextOverlay';
import { ThemeSelector } from './ThemeSelector';
import { AspectRatioSelector } from './AspectRatioSelector';
import { CitySearch } from './CitySearch';
import { ZoomControls } from './ZoomControls';
import { AIPromptInput } from './AIPromptInput';
import { SettingsTabs } from './SettingsTabs';
import { ClearCacheButton } from './ClearCacheButton';
import { ExportDialog } from './ExportDialog';
import { PhotoUploader } from './PhotoUploader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Map, Camera } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Inline live-data toggle button (planes/ships)
const LiveDataToggle = ({ type, liveData, onLiveDataChange, mapCenter, distance }: {
  type: 'flights' | 'ships';
  liveData: LiveDataOverlay[];
  onLiveDataChange: (data: LiveDataOverlay[]) => void;
  mapCenter: { lat: number; lng: number };
  distance: number;
}) => {
  const [loading, setLoading] = useState(false);
  const overlay = liveData.find(d => d.type === type);
  const Icon = type === 'flights' ? Plane : Ship;
  const label = type === 'flights' ? 'Flugzeuge' : 'Schiffe';

  const handleClick = async () => {
    if (overlay?.enabled) {
      onLiveDataChange(liveData.map(d => d.type === type ? { ...d, enabled: false } : d));
      return;
    }
    if (overlay?.snapshotData) {
      onLiveDataChange(liveData.map(d => d.type === type ? { ...d, enabled: true } : d));
      return;
    }
    setLoading(true);
    try {
      const kmRadius = distance / 1000;
      const latDelta = kmRadius / 111;
      const lngDelta = kmRadius / (111 * Math.cos(mapCenter.lat * Math.PI / 180));
      let points: LiveDataPoint[] = [];

      if (type === 'flights') {
        try {
          const resp = await fetch(
            `https://api.adsb.lol/v2/lat/${mapCenter.lat.toFixed(4)}/lon/${mapCenter.lng.toFixed(4)}/dist/${Math.min(Math.round(kmRadius), 250)}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (resp.ok) {
            const data = await resp.json();
            points = (data.ac || []).slice(0, 120).map((a: any) => ({
              id: `flight-${a.hex || Math.random()}`,
              lat: a.lat || 0, lng: a.lon || 0,
              heading: a.track || a.true_heading || 0,
              type: 'plane' as const,
              label: (a.flight || '').trim() || a.r || undefined,
              speed: a.gs ? Math.round(a.gs * 1.852) : undefined,
              altitude: a.alt_baro ?? a.alt_geom ?? undefined,
            })).filter((p: LiveDataPoint) => p.lat !== 0 && p.lng !== 0);
          }
        } catch { /* fallback below */ }

        if (points.length === 0) {
          try {
            const mil = await fetch('https://api.facha.dev/v1/aircraft/live/military', { signal: AbortSignal.timeout(8000) });
            if (mil.ok) {
              const data: any[] = await mil.json();
              points = data
                .filter(a => a.lat >= mapCenter.lat - latDelta && a.lat <= mapCenter.lat + latDelta &&
                              a.lon >= mapCenter.lng - lngDelta && a.lon <= mapCenter.lng + lngDelta)
                .map(a => ({
                  id: `mil-${a.icao || Math.random()}`,
                  lat: a.lat, lng: a.lon,
                  heading: a.heading || 0, type: 'plane' as const,
                  label: (a.callsign || '').trim() || a.reg || undefined,
                  altitude: a.baroAltitude ?? undefined,
                }));
            }
          } catch { /* none */ }
        }
      } else {
        try {
          const resp = await fetch(
            'https://meri.digitraffic.fi/api/ais/v1/locations',
            { signal: AbortSignal.timeout(12000) }
          );
          if (resp.ok) {
            const data = await resp.json();
            points = (data.features || [])
              .filter((f: any) => {
                const [lon, shipLat] = f.geometry?.coordinates || [0, 0];
                return shipLat >= mapCenter.lat - latDelta && shipLat <= mapCenter.lat + latDelta &&
                       lon >= mapCenter.lng - lngDelta && lon <= mapCenter.lng + lngDelta;
              })
              .sort((a: any, b: any) => (b.properties?.timestampExternal || 0) - (a.properties?.timestampExternal || 0))
              .slice(0, 100)
              .map((f: any) => {
                const p = f.properties || {};
                const [lon, shipLat] = f.geometry?.coordinates || [0, 0];
                return {
                  id: `ship-${p.mmsi || Math.random()}`,
                  lat: shipLat, lng: lon,
                  heading: p.heading < 360 ? p.heading : p.cog || 0,
                  type: 'ship' as const,
                  label: p.name || undefined,
                  speed: p.sog ? Math.round(p.sog * 1.852) : undefined,
                };
              })
              .filter((p: any) => p.lat !== 0 && p.lng !== 0);
          }
        } catch { /* none */ }
      }

      const newOverlay: LiveDataOverlay = {
        type, enabled: true,
        snapshotData: points,
        snapshotTime: new Date().toISOString(),
      };
      const updated = liveData.filter(d => d.type !== type);
      updated.push(newOverlay);
      onLiveDataChange(updated);
      toast.success(`${points.length} ${label} erfasst`);
    } catch {
      toast.error(`Fehler beim Laden der ${label}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        overlay?.enabled
          ? 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
      }`}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
      {label}
      {overlay?.snapshotData && <span className="opacity-60">({overlay.snapshotData.length})</span>}
    </button>
  );
};

interface PosterEditorProps {
  initialConfig?: PosterConfig;
  onConfigChange?: (config: PosterConfig) => void;
}

export const PosterEditor = ({ initialConfig, onConfigChange }: PosterEditorProps) => {
  const [config, setConfig] = useState<PosterConfig>(initialConfig || DEFAULT_CONFIG);
  const posterRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 533 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const openFullscreen = useCallback(() => {
    const canvas = posterRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    setFullscreenImage(canvas.toDataURL('image/png'));
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setFullscreenImage(null);
  }, []);
  const { t } = useLanguage();

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

  // Handle icon position change when user drags an icon
  const handleIconMove = (iconId: string, lat: number, lng: number) => {
    setConfig((prev) => {
      const updatedIcons = (prev.mapIcons || []).map(icon =>
        icon.id === iconId ? { ...icon, lat, lng } : icon
      );
      const newConfig = { ...prev, mapIcons: updatedIcons };
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
  useEffect(() => {
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, [updateContainerSize]);

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
              <h1 className="font-semibold text-lg text-foreground">{t('header.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
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
              {/* Mode Toggle */}
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => handleConfigUpdate({ posterMode: 'map' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    config.posterMode !== 'photo'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  {t('mode.map' as any) || 'Map Poster'}
                </button>
                <button
                  onClick={() => handleConfigUpdate({ posterMode: 'photo' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    config.posterMode === 'photo'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {t('mode.photo' as any) || 'Photo Poster'}
                </button>
              </div>

              {config.posterMode === 'photo' ? (
                <>
                  {/* Photo Upload */}
                  <PhotoUploader
                    photoDataUrl={config.photoDataUrl}
                    exifData={config.photoExif}
                    onPhotoChange={(dataUrl, exif) => handleConfigUpdate({ photoDataUrl: dataUrl, photoExif: exif })}
                  />

                  <Separator />

                  {/* Theme Selector */}
                  <ThemeSelector
                    selectedTheme={config.theme}
                    onThemeChange={handleThemeChange}
                  />

                  {/* Format */}
                  <AspectRatioSelector
                    aspectRatio={config.aspectRatio}
                    onAspectRatioChange={(ratio: AspectRatioId) => handleConfigUpdate({ aspectRatio: ratio })}
                  />

                  <Separator />
                  <SettingsTabs config={config} onConfigUpdate={handleConfigUpdate} />
                </>
              ) : (
                <>
                  {/* City Search */}
                  <CitySearch onCitySelect={handleCitySelect} />

                  <Separator />

                  {/* Theme Selector */}
                  <ThemeSelector
                    selectedTheme={config.theme}
                    onThemeChange={handleThemeChange}
                  />

                  {/* Format / Aspect Ratio Selector */}
                  <AspectRatioSelector
                    aspectRatio={config.aspectRatio}
                    onAspectRatioChange={(ratio: AspectRatioId) => handleConfigUpdate({ aspectRatio: ratio })}
                  />

                  <Separator />
                  <SettingsTabs config={config} onConfigUpdate={handleConfigUpdate} />
                </>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('footer.vectorHint')}
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
                  // @ts-ignore
                  posterRef.current = el;
                  setTimeout(updateContainerSize, 100);
                }
              }}
            >
              {config.posterMode === 'photo' ? (
                <PhotoPosterPreview 
                  config={config} 
                  containerRef={posterRef} 
                />
              ) : (
                <>
                  <CanvasPosterPreview 
                    config={config} 
                    containerRef={posterRef} 
                    onMapCenterChange={handleMapCenterChange}
                    onIconMove={handleIconMove}
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

                  {/* Fullscreen button */}
                  <button
                    onClick={openFullscreen}
                    className="absolute top-2 right-2 z-20 p-2 rounded-lg bg-background/80 hover:bg-background border border-border shadow-md backdrop-blur-sm"
                    title="Vollbild"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </motion.div>

            {/* Live data toggles below preview */}
            {config.posterMode !== 'photo' && (
              <div className="max-w-lg mx-auto flex items-center gap-2 justify-center flex-wrap">
                <LiveDataToggle
                  type="flights"
                  liveData={config.liveData || []}
                  onLiveDataChange={(data) => handleConfigUpdate({ liveData: data })}
                  mapCenter={{ lat: config.latitude, lng: config.longitude }}
                  distance={config.distance}
                />
                <LiveDataToggle
                  type="ships"
                  liveData={config.liveData || []}
                  onLiveDataChange={(data) => handleConfigUpdate({ liveData: data })}
                  mapCenter={{ lat: config.latitude, lng: config.longitude }}
                  distance={config.distance}
                />
              </div>
            )}

            {/* Fullscreen preview overlay with watermark + download protection */}
            {isFullscreen && (
              <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                onClick={closeFullscreen}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}>
                <button onClick={closeFullscreen}
                  className="absolute top-4 right-4 z-[101] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}>
                  {fullscreenImage ? (
                    <>
                      {/* Image as background-image so 'Save Image As' is unavailable */}
                      <div role="img" aria-label="Poster Preview"
                        style={{
                          backgroundImage: `url(${fullscreenImage})`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          width: '90vw',
                          height: '90vh',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          pointerEvents: 'none',
                        } as React.CSSProperties} />
                      {/* Transparent click-blocker on top */}
                      <div className="absolute inset-0"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties} />
                    </>
                  ) : (
                    <div className="text-white/50 text-sm">Lade Vorschau...</div>
                  )}
                  {/* Diagonal watermark — visible on screenshots */}
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden mix-blend-difference"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="absolute whitespace-nowrap font-bold tracking-[0.5em]"
                        style={{
                          fontSize: '14px',
                          color: 'rgba(255,255,255,0.22)',
                          transform: 'rotate(-30deg)',
                          top: `${-5 + i * 10}%`,
                          left: '-30%',
                          width: '200%',
                        }}>
                        {'CITYMAP\u00b7POSTER\u2003PREVIEW\u2003'.repeat(20)}
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white/80 text-xs px-4 py-2 rounded-full pointer-events-none">
                    Vorschau — Export für volle Auflösung
                  </div>
                </div>
              </div>
            )}
            
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
