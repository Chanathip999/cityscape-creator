import { PosterConfig } from '@/types/poster';

interface PosterPreviewProps {
  config: PosterConfig;
}

const formatCoordinates = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir} / ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
};

const spacedText = (text: string): string => {
  return text.toUpperCase().split('').join(' ');
};

export const PosterPreview = ({ config }: PosterPreviewProps) => {
  const { city, country, countryLabel, latitude, longitude, theme } = config;
  
  return (
    <div 
      className="relative w-full aspect-[3/4] rounded-lg shadow-2xl overflow-hidden transition-all duration-500"
      style={{ backgroundColor: theme.bg }}
    >
      {/* Map placeholder area */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ backgroundColor: theme.bg }}
      >
        <div className="text-center opacity-30" style={{ color: theme.text }}>
          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm font-mono">Map Preview</p>
        </div>
      </div>
      
      {/* Top gradient fade */}
      <div 
        className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none"
        style={{ 
          background: `linear-gradient(to bottom, ${theme.gradientColor} 0%, transparent 100%)` 
        }}
      />
      
      {/* Bottom gradient fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{ 
          background: `linear-gradient(to top, ${theme.gradientColor} 0%, transparent 100%)` 
        }}
      />
      
      {/* Typography section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
        {/* City name */}
        <h1 
          className="poster-title text-2xl md:text-3xl lg:text-4xl mb-2"
          style={{ color: theme.text }}
        >
          {spacedText(city)}
        </h1>
        
        {/* Decorative line */}
        <div 
          className="w-24 h-px mx-auto mb-2"
          style={{ backgroundColor: theme.text }}
        />
        
        {/* Country */}
        <p 
          className="poster-subtitle text-xs md:text-sm mb-1"
          style={{ color: theme.text }}
        >
          {(countryLabel || country).toUpperCase()}
        </p>
        
        {/* Coordinates */}
        <p 
          className="poster-coords text-xs opacity-70"
          style={{ color: theme.text }}
        >
          {formatCoordinates(latitude, longitude)}
        </p>
      </div>
      
      {/* Attribution */}
      <p 
        className="absolute bottom-2 right-2 text-[8px] opacity-50 font-mono"
        style={{ color: theme.text }}
      >
        © OpenStreetMap contributors
      </p>
    </div>
  );
};
