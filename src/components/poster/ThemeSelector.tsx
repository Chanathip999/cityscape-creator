import { PosterTheme, POSTER_THEMES } from '@/types/poster';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ThemeSelectorProps {
  selectedTheme: PosterTheme;
  onThemeChange: (theme: PosterTheme) => void;
}

export const ThemeSelector = ({ selectedTheme, onThemeChange }: ThemeSelectorProps) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Theme</label>
      <div className="grid grid-cols-5 gap-2">
        {POSTER_THEMES.map((theme) => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onThemeChange(theme)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              selectedTheme.id === theme.id
                ? 'border-accent ring-2 ring-accent/30'
                : 'border-border hover:border-muted-foreground/30'
            }`}
            title={theme.name}
          >
            {/* Theme preview */}
            <div 
              className="absolute inset-0"
              style={{ backgroundColor: theme.bg }}
            >
              {/* Mini road lines */}
              <div className="absolute inset-2 flex flex-col justify-center gap-1">
                <div 
                  className="h-0.5 w-full rounded"
                  style={{ backgroundColor: theme.roadMotorway }}
                />
                <div 
                  className="h-0.5 w-3/4 rounded ml-auto"
                  style={{ backgroundColor: theme.roadSecondary }}
                />
                <div 
                  className="h-0.5 w-1/2 rounded"
                  style={{ backgroundColor: theme.roadResidential }}
                />
              </div>
              
              {/* Theme text color indicator */}
              <div 
                className="absolute bottom-1 left-1 right-1 h-1 rounded"
                style={{ backgroundColor: theme.text }}
              />
            </div>
            
            {/* Selected indicator */}
            {selectedTheme.id === theme.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-accent/20"
              >
                <div className="bg-accent rounded-full p-0.5">
                  <Check className="w-3 h-3 text-accent-foreground" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{selectedTheme.name}</p>
    </div>
  );
};
