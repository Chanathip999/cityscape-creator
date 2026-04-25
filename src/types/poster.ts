export interface PosterTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  water: string;
  parks: string;
  railway?: string; // Railway color (optional, from maptoposter)
  roadMotorway: string;
  roadPrimary: string;
  roadSecondary: string;
  roadTertiary: string;
  roadResidential: string;
  roadService: string;
  roadDefault?: string; // Default road color for unknown types
  gradientColor: string;
}

export type FontFamily = 'mono' | 'sans' | 'serif' | 'display' | 'elegant' | 'condensed' | 'script' | 'retro' | 'minimal' | 'brutalist';
export type FontSize = 'small' | 'medium' | 'large';
export type PosterOrientation = 'vertical' | 'horizontal';
export type AspectRatioId = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '6:19' | '19:6';
export type ExportFormat = 'png' | 'jpeg';
export type ExportResolution = 'fullhd' | '4k' | '8k';
export type RenderMode = 'vector';
export type TextPosition = 'bottom' | 'center' | 'top';

// Text layout styles (as seen in screenshot references)
export type TextLayoutStyle = 'classic' | 'modern' | 'minimal' | 'editorial';

// Map marker icon types
export type MapIconType = 
  | 'pin' | 'heart' | 'star' | 'home' | 'flag'
  | 'plane' | 'train' | 'car' | 'bike' | 'bus'
  | 'ship' | 'helicopter' | 'parking' | 'fuel'
  | 'restaurant' | 'cafe' | 'hotel' | 'hospital'
  | 'church' | 'monument' | 'castle' | 'stadium'
  | 'university' | 'school' | 'library' | 'museum';

// Custom map icon placed by user
export interface MapIcon {
  id: string;
  type: MapIconType;
  lat: number;
  lng: number;
  color?: string;
  size?: number; // 0.5 - 2.0 scale
  label?: string;
}

// Custom image overlay
export interface MapImage {
  id: string;
  dataUrl: string; // Base64 or object URL
  lat: number;
  lng: number;
  width: number; // Normalized 0-1 relative to map width
  height: number;
  rotation?: number; // Degrees
  opacity?: number; // 0-1
}

// Route between two locations
export interface MapRoute {
  id: string;
  startAddress: string;
  endAddress: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  color: string;
  width?: number; // Line width multiplier
  routePoints?: [number, number][]; // Actual route geometry from routing API
}

export interface AspectRatio {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface ExportOption {
  id: ExportResolution;
  name: string;
  multiplier: number;
  description: string;
}

export interface LayerVisibility {
  water: boolean;
  forests: boolean;
  parks: boolean;
  railways: boolean;
  aeroways: boolean;
  coastlines: boolean;
  buildings: boolean;
  // New optional layers (all disabled by default)
  sideStreets: boolean;
  footpaths: boolean;
  cycleways: boolean;
  paths: boolean;
  mainRoads: boolean;
  trainStations: boolean;
  cableways: boolean;
  residentialBuildings: boolean;
  commercialBuildings: boolean;
  lakes: boolean;
  rivers: boolean;
  monuments: boolean;
  stadiums: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  water: true,
  forests: false, // Disabled by default for faster loading
  parks: false, // Disabled by default for faster loading
  railways: true,
  aeroways: true,
  coastlines: false, // Disabled by default for faster loading
  buildings: true,
  // New layers - all disabled by default
  sideStreets: false,
  footpaths: false,
  cycleways: false,
  paths: false,
  mainRoads: false,
  trainStations: false,
  cableways: false,
  residentialBuildings: false,
  commercialBuildings: false,
  lakes: false,
  rivers: false,
  monuments: false,
  stadiums: false,
};

// Custom layer colors (optional overrides)
export interface LayerColors {
  water?: string;
  forests?: string;
  parks?: string;
  railways?: string;
  aeroways?: string;
  coastlines?: string;
  buildings?: string;
  sideStreets?: string;
  footpaths?: string;
  cycleways?: string;
  paths?: string;
  mainRoads?: string;
  trainStations?: string;
  cableways?: string;
  residentialBuildings?: string;
  commercialBuildings?: string;
  lakes?: string;
  rivers?: string;
  monuments?: string;
  stadiums?: string;
}

export const DEFAULT_LAYER_COLORS: LayerColors = {};

// Font size scale (0.5 to 2.0, 1.0 = medium)
export type FontSizeScale = number;

// Custom text position (normalized 0-1 coordinates)
export interface TextPositionOffset {
  x: number; // 0 = left, 0.5 = center, 1 = right
  y: number; // 0 = top, 1 = bottom
}

// Text orientation type
export type TextOrientation = 'horizontal' | 'vertical';

// Individual text element override
export interface TextElementConfig {
  position?: TextPositionOffset;
  scale?: number; // Size multiplier (1.0 = default)
  orientation?: TextOrientation; // Text direction
}

// All text overrides
export interface TextOverrides {
  city?: TextElementConfig;
  country?: TextElementConfig;
  coordinates?: TextElementConfig;
}

// Photo mode types
export type PosterMode = 'map' | 'photo';

export interface LiveDataOverlay {
  type: 'flights' | 'ships';
  enabled: boolean;
  snapshotData?: LiveDataPoint[];
  snapshotTime?: string;
}

export interface LiveDataPoint {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  type: 'plane' | 'ship';
  label?: string;
  speed?: number;
  altitude?: number;
}

export interface PhotoExifData {
  location?: string;
  latitude?: number;
  longitude?: number;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  dateTime?: string;
  width?: number;
  height?: number;
}

export interface PosterConfig {
  // Mode
  posterMode: PosterMode;
  // Photo mode
  photoDataUrl?: string;
  photoExif?: PhotoExifData;
  // Map mode
  city: string;
  country: string;
  countryLabel?: string;
  latitude: number;
  longitude: number;
  distance: number;
  theme: PosterTheme;
  width: number;
  height: number;
  fontFamily: FontFamily;
  fontSize: FontSize;
  fontSizeScale: FontSizeScale; // Fine-tuning 0.5 - 2.0
  orientation: PosterOrientation;
  aspectRatio: AspectRatioId;
  customTextColor?: string;
  customMotorwayColor?: string; // Separate color for motorways/highways
  customRoadColor?: string; // Color for other roads
  customBackgroundColor?: string;
  coloredStreets?: boolean;
  renderMode: RenderMode;
  layerVisibility: LayerVisibility;
  layerColors: LayerColors; // Custom layer colors
  showCoordinates: boolean;
  showCountry: boolean;
  showCity: boolean;
  showGradients: boolean;
  textPosition: TextPosition;
  textLayoutStyle: TextLayoutStyle; // Layout style preset
  textOverrides?: TextOverrides; // Custom text positions and sizes
  // Map overlays
  mapIcons: MapIcon[];
  mapImages: MapImage[];
  mapRoutes: MapRoute[];
  // Live data snapshots (planes / ships)
  liveData?: LiveDataOverlay[];
}

export const TEXT_POSITIONS_OPTIONS: { id: TextPosition; name: string }[] = [
  { id: 'bottom', name: 'Unten' },
  { id: 'center', name: 'Mitte' },
  { id: 'top', name: 'Oben' },
];

// Text layout style presets (based on screenshot references)
export interface TextLayoutStyleConfig {
  id: TextLayoutStyle;
  name: string;
  description: string;
  showSeparatorLine: boolean;
  textAlign: 'center' | 'left' | 'right';
  cityUppercase: boolean;
  countryUppercase: boolean;
  coordsStyle: 'standard' | 'compact' | 'hidden';
  spacing: 'tight' | 'normal' | 'loose';
}

export const TEXT_LAYOUT_STYLES: TextLayoutStyleConfig[] = [
  {
    id: 'classic',
    name: 'Klassisch',
    description: 'Zentriert mit Trennlinie',
    showSeparatorLine: true,
    textAlign: 'center',
    cityUppercase: true,
    countryUppercase: true,
    coordsStyle: 'standard',
    spacing: 'normal',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Zentriert ohne Linie',
    showSeparatorLine: false,
    textAlign: 'center',
    cityUppercase: true,
    countryUppercase: false,
    coordsStyle: 'compact',
    spacing: 'tight',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Links ausgerichtet',
    showSeparatorLine: false,
    textAlign: 'left',
    cityUppercase: true,
    countryUppercase: true,
    coordsStyle: 'compact',
    spacing: 'tight',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Handschrift-Stil',
    showSeparatorLine: false,
    textAlign: 'center',
    cityUppercase: false,
    countryUppercase: false,
    coordsStyle: 'hidden',
    spacing: 'loose',
  },
];

// Map icon definitions
export const MAP_ICON_OPTIONS: { id: MapIconType; name: string; category: string }[] = [
  // Location markers
  { id: 'pin', name: 'Pin', category: 'Markierungen' },
  { id: 'heart', name: 'Herz', category: 'Markierungen' },
  { id: 'star', name: 'Stern', category: 'Markierungen' },
  { id: 'home', name: 'Zuhause', category: 'Markierungen' },
  { id: 'flag', name: 'Flagge', category: 'Markierungen' },
  // Transport
  { id: 'plane', name: 'Flugzeug', category: 'Transport' },
  { id: 'train', name: 'Zug', category: 'Transport' },
  { id: 'car', name: 'Auto', category: 'Transport' },
  { id: 'bike', name: 'Fahrrad', category: 'Transport' },
  { id: 'bus', name: 'Bus', category: 'Transport' },
  { id: 'ship', name: 'Schiff', category: 'Transport' },
  { id: 'helicopter', name: 'Hubschrauber', category: 'Transport' },
  // Facilities
  { id: 'parking', name: 'Parkplatz', category: 'Einrichtungen' },
  { id: 'fuel', name: 'Tankstelle', category: 'Einrichtungen' },
  { id: 'restaurant', name: 'Restaurant', category: 'Einrichtungen' },
  { id: 'cafe', name: 'Café', category: 'Einrichtungen' },
  { id: 'hotel', name: 'Hotel', category: 'Einrichtungen' },
  { id: 'hospital', name: 'Krankenhaus', category: 'Einrichtungen' },
  // Landmarks
  { id: 'church', name: 'Kirche', category: 'Sehenswürdigkeiten' },
  { id: 'monument', name: 'Denkmal', category: 'Sehenswürdigkeiten' },
  { id: 'castle', name: 'Schloss', category: 'Sehenswürdigkeiten' },
  { id: 'stadium', name: 'Stadion', category: 'Sehenswürdigkeiten' },
  { id: 'university', name: 'Universität', category: 'Sehenswürdigkeiten' },
  { id: 'school', name: 'Schule', category: 'Sehenswürdigkeiten' },
  { id: 'library', name: 'Bibliothek', category: 'Sehenswürdigkeiten' },
  { id: 'museum', name: 'Museum', category: 'Sehenswürdigkeiten' },
];

export const ASPECT_RATIOS: AspectRatio[] = [
  { id: '1:1', name: 'Quadrat', width: 1, height: 1 },
  { id: '2:3', name: 'Foto Portrait', width: 2, height: 3 },
  { id: '3:2', name: 'Foto Landscape', width: 3, height: 2 },
  { id: '3:4', name: 'Portrait', width: 3, height: 4 },
  { id: '4:3', name: 'Landscape', width: 4, height: 3 },
  { id: '4:5', name: 'Instagram', width: 4, height: 5 },
  { id: '5:4', name: 'Large Print', width: 5, height: 4 },
  { id: '9:16', name: 'Story', width: 9, height: 16 },
  { id: '16:9', name: 'Breitbild', width: 16, height: 9 },
  { id: '6:19', name: 'Panorama Hoch', width: 6, height: 19 },
  { id: '19:6', name: 'Panorama Quer', width: 19, height: 6 },
];

export const EXPORT_FORMATS: { id: ExportFormat; name: string; mimeType: string }[] = [
  { id: 'png', name: 'PNG', mimeType: 'image/png' },
  { id: 'jpeg', name: 'JPEG', mimeType: 'image/jpeg' },
];

export const EXPORT_RESOLUTIONS: ExportOption[] = [
  { id: 'fullhd', name: 'Full HD', multiplier: 1, description: '1920px' },
  { id: '4k', name: '4K', multiplier: 2, description: '3840px' },
  { id: '8k', name: '8K', multiplier: 4, description: '7680px' },
];

export const POSTER_THEMES: PosterTheme[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    bg: '#E8F4F8',
    text: '#1B4965',
    water: '#B8D4E3',
    parks: '#D5E8D4',
    railway: '#1B4965',
    roadMotorway: '#1B4965',
    roadPrimary: '#2D6A8A',
    roadSecondary: '#4A8DAD',
    roadTertiary: '#6AB0D0',
    roadResidential: '#8CC8E0',
    roadService: '#A8D8EC',
    roadDefault: '#6AB0D0',
    gradientColor: '#E8F4F8',
  },
  {
    id: 'noir',
    name: 'Noir',
    bg: '#0D0D0D',
    text: '#FFFFFF',
    water: '#1A1A1A',
    parks: '#151515',
    railway: '#666666',
    roadMotorway: '#FFFFFF',
    roadPrimary: '#D0D0D0',
    roadSecondary: '#A0A0A0',
    roadTertiary: '#707070',
    roadResidential: '#505050',
    roadService: '#353535',
    roadDefault: '#707070',
    gradientColor: '#0D0D0D',
  },
  {
    id: 'beige',
    name: 'Warm Beige',
    bg: '#F5F0E6',
    text: '#4A4035',
    water: '#D8D0C0',
    parks: '#E0E8D8',
    railway: '#8A7060',
    roadMotorway: '#4A4035',
    roadPrimary: '#6A6055',
    roadSecondary: '#8A8075',
    roadTertiary: '#AAA095',
    roadResidential: '#C0B8AD',
    roadService: '#D5D0C8',
    roadDefault: '#AAA095',
    gradientColor: '#F5F0E6',
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    bg: '#0A1628',
    text: '#D4A853',
    water: '#0F1E35',
    parks: '#0C1A2E',
    railway: '#D4A853',
    roadMotorway: '#D4A853',
    roadPrimary: '#B8923F',
    roadSecondary: '#8A6E30',
    roadTertiary: '#5C4A20',
    roadResidential: '#3D3115',
    roadService: '#2A2210',
    roadDefault: '#5C4A20',
    gradientColor: '#0A1628',
  },
  {
    id: 'copper',
    name: 'Copper Patina',
    bg: '#E8F0ED',
    text: '#2D5249',
    water: '#C5D9D2',
    parks: '#D5E5DE',
    railway: '#2D5249',
    roadMotorway: '#2D5249',
    roadPrimary: '#3D6A5F',
    roadSecondary: '#5A8A7F',
    roadTertiary: '#7AABA0',
    roadResidential: '#9AC8BE',
    roadService: '#B5DCD5',
    roadDefault: '#7AABA0',
    gradientColor: '#E8F0ED',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    bg: '#FAF4EE',
    text: '#8B4513',
    water: '#E8DFD5',
    parks: '#E5E8DC',
    railway: '#8B4513',
    roadMotorway: '#A0522D',
    roadPrimary: '#B87333',
    roadSecondary: '#CD853F',
    roadTertiary: '#DEB887',
    roadResidential: '#E8D4C0',
    roadService: '#F0E0D0',
    roadDefault: '#DEB887',
    gradientColor: '#FAF4EE',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#EEF4F0',
    text: '#2F4F4F',
    water: '#C8E0D8',
    parks: '#D5E8DC',
    railway: '#2F4F4F',
    roadMotorway: '#2F4F4F',
    roadPrimary: '#3D6B5C',
    roadSecondary: '#5A8A7A',
    roadTertiary: '#7AAA9A',
    roadResidential: '#A0C8B8',
    roadService: '#B8DCD0',
    roadDefault: '#7AAA9A',
    gradientColor: '#EEF4F0',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    bg: '#FAFAFA',
    text: '#1A1A1A',
    water: '#D0D0D0',
    parks: '#E8E8E8',
    railway: '#1A1A1A',
    roadMotorway: '#1A1A1A',
    roadPrimary: '#333333',
    roadSecondary: '#666666',
    roadTertiary: '#999999',
    roadResidential: '#CCCCCC',
    roadService: '#DDDDDD',
    roadDefault: '#999999',
    gradientColor: '#FAFAFA',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#FDF5F0',
    text: '#C04000',
    water: '#F5E8E0',
    parks: '#F0E8DC',
    railway: '#C04000',
    roadMotorway: '#C04000',
    roadPrimary: '#D06030',
    roadSecondary: '#E08060',
    roadTertiary: '#F0A090',
    roadResidential: '#F8C8B8',
    roadService: '#FAD8CC',
    roadDefault: '#F0A090',
    gradientColor: '#FDF5F0',
  },
  {
    // Neon Cyberpunk theme - EXACT values from maptoposter neon_cyberpunk.json
    // https://github.com/Chanathip999/maptoposter/blob/main/themes/neon_cyberpunk.json
    id: 'neon',
    name: 'Neon Cyberpunk',
    bg: '#0D0D1A',           // Dark night blue/black (exact)
    text: '#00FFFF',         // Electric Cyan text (exact)
    water: '#0A0A15',        // Very dark blue-tinted (exact)
    parks: '#151525',        // Dark purple-tinted (exact)
    railway: '#FFFF00',      // Yellow railways
    roadMotorway: '#FF00FF', // Electric Pink (exact from JSON)
    roadPrimary: '#00FFFF',  // Electric Cyan (exact from JSON)
    roadSecondary: '#00C8C8',
    roadTertiary: '#0098A0',
    roadResidential: '#006870',
    roadService: '#004850',
    roadDefault: '#0098A0',
    gradientColor: '#0D0D1A',
  },
  {
    id: 'paris-blanc',
    name: 'Paris Blanc',
    bg: '#FAF7F2',
    text: '#2C2826',
    water: '#C9D6DE',
    parks: '#D8E3C9',
    railway: '#2C2826',
    roadMotorway: '#2C2826',
    roadPrimary: '#5C5854',
    roadSecondary: '#8C8884',
    roadTertiary: '#B0ACA8',
    roadResidential: '#D0CCC8',
    roadService: '#E0DCD8',
    roadDefault: '#B0ACA8',
    gradientColor: '#FAF7F2',
  },
  {
    id: 'tokyo-pink',
    name: 'Tokyo Sakura',
    bg: '#FFF0F3',
    text: '#7A2C3F',
    water: '#FAD2DC',
    parks: '#E8DCC0',
    railway: '#7A2C3F',
    roadMotorway: '#A8344C',
    roadPrimary: '#C24A66',
    roadSecondary: '#D86B86',
    roadTertiary: '#E89AAE',
    roadResidential: '#F0BCC8',
    roadService: '#F8DCE2',
    roadDefault: '#E89AAE',
    gradientColor: '#FFF0F3',
  },
  {
    id: 'london-fog',
    name: 'London Fog',
    bg: '#E0E0DB',
    text: '#2A2E33',
    water: '#A8B0B6',
    parks: '#B8C0AE',
    railway: '#2A2E33',
    roadMotorway: '#2A2E33',
    roadPrimary: '#4A4F55',
    roadSecondary: '#6A7077',
    roadTertiary: '#8A9098',
    roadResidential: '#ACB2B8',
    roadService: '#C8CDD2',
    roadDefault: '#8A9098',
    gradientColor: '#E0E0DB',
  },
  {
    id: 'new-york-grid',
    name: 'New York Grid',
    bg: '#1A1A1A',
    text: '#F5C518',
    water: '#0A1F33',
    parks: '#1F2E1F',
    railway: '#F5C518',
    roadMotorway: '#F5C518',
    roadPrimary: '#E8B814',
    roadSecondary: '#B89010',
    roadTertiary: '#88680C',
    roadResidential: '#5C4708',
    roadService: '#3D3006',
    roadDefault: '#88680C',
    gradientColor: '#1A1A1A',
  },
  {
    id: 'santorini',
    name: 'Santorini',
    bg: '#FBFCFD',
    text: '#1E5E9A',
    water: '#5BA3D0',
    parks: '#D6E8E0',
    railway: '#1E5E9A',
    roadMotorway: '#1E5E9A',
    roadPrimary: '#3478B5',
    roadSecondary: '#5B9CCC',
    roadTertiary: '#86BBDC',
    roadResidential: '#B0D2E8',
    roadService: '#D2E5F0',
    roadDefault: '#86BBDC',
    gradientColor: '#FBFCFD',
  },
  {
    id: 'venice-gold',
    name: 'Venice Gold',
    bg: '#F4ECD8',
    text: '#5A3C0A',
    water: '#9CB7C0',
    parks: '#C8C28C',
    railway: '#5A3C0A',
    roadMotorway: '#5A3C0A',
    roadPrimary: '#7A562A',
    roadSecondary: '#9A7848',
    roadTertiary: '#B89868',
    roadResidential: '#D4B888',
    roadService: '#E6D4AC',
    roadDefault: '#B89868',
    gradientColor: '#F4ECD8',
  },
  {
    id: 'iceland',
    name: 'Iceland Glacier',
    bg: '#EAF3F7',
    text: '#274B63',
    water: '#A0C2D8',
    parks: '#C0D0CC',
    railway: '#274B63',
    roadMotorway: '#274B63',
    roadPrimary: '#456A82',
    roadSecondary: '#688AA0',
    roadTertiary: '#8FAABB',
    roadResidential: '#B4C8D4',
    roadService: '#D4DEE6',
    roadDefault: '#8FAABB',
    gradientColor: '#EAF3F7',
  },
  {
    id: 'sahara',
    name: 'Sahara Dune',
    bg: '#F5E1B8',
    text: '#6B3F18',
    water: '#D8C088',
    parks: '#C8B070',
    railway: '#6B3F18',
    roadMotorway: '#6B3F18',
    roadPrimary: '#8E5A28',
    roadSecondary: '#B07840',
    roadTertiary: '#C89868',
    roadResidential: '#DCB890',
    roadService: '#E8CFAC',
    roadDefault: '#C89868',
    gradientColor: '#F5E1B8',
  },
  {
    id: 'amazon',
    name: 'Amazon Jungle',
    bg: '#0E1F18',
    text: '#A8E6BC',
    water: '#1F4030',
    parks: '#1B3826',
    railway: '#A8E6BC',
    roadMotorway: '#A8E6BC',
    roadPrimary: '#7AC894',
    roadSecondary: '#5AA876',
    roadTertiary: '#3F8858',
    roadResidential: '#2C683E',
    roadService: '#1F4828',
    roadDefault: '#3F8858',
    gradientColor: '#0E1F18',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    bg: '#FBEEE6',
    text: '#7A3A2E',
    water: '#E8C8B8',
    parks: '#E0CFB8',
    railway: '#7A3A2E',
    roadMotorway: '#B86850',
    roadPrimary: '#C8806A',
    roadSecondary: '#D89A86',
    roadTertiary: '#E4B5A2',
    roadResidential: '#EECDBE',
    roadService: '#F4DDD2',
    roadDefault: '#E4B5A2',
    gradientColor: '#FBEEE6',
  },
  {
    id: 'lavender',
    name: 'Lavender Field',
    bg: '#F0EAF6',
    text: '#4A2E6A',
    water: '#C8B8DC',
    parks: '#D0C8B8',
    railway: '#4A2E6A',
    roadMotorway: '#4A2E6A',
    roadPrimary: '#6B4A8E',
    roadSecondary: '#8C6BB0',
    roadTertiary: '#AC92C8',
    roadResidential: '#C8B5DC',
    roadService: '#DCD0E8',
    roadDefault: '#AC92C8',
    gradientColor: '#F0EAF6',
  },
  {
    id: 'mint',
    name: 'Mint Fresh',
    bg: '#EAF7F2',
    text: '#1F4F3F',
    water: '#A8D6C8',
    parks: '#C0DEC8',
    railway: '#1F4F3F',
    roadMotorway: '#1F4F3F',
    roadPrimary: '#3D7A66',
    roadSecondary: '#5C9C86',
    roadTertiary: '#84BAAA',
    roadResidential: '#B0D2C8',
    roadService: '#D0E2D8',
    roadDefault: '#84BAAA',
    gradientColor: '#EAF7F2',
  },
  {
    id: 'volcano',
    name: 'Volcano',
    bg: '#1A0E0E',
    text: '#FF6B35',
    water: '#2A1818',
    parks: '#1F1212',
    railway: '#FF6B35',
    roadMotorway: '#FF6B35',
    roadPrimary: '#E0501F',
    roadSecondary: '#B83C12',
    roadTertiary: '#8E2A0A',
    roadResidential: '#5C1C06',
    roadService: '#3A1004',
    roadDefault: '#8E2A0A',
    gradientColor: '#1A0E0E',
  },
  {
    id: 'pastel-sky',
    name: 'Pastel Sky',
    bg: '#F0F4FA',
    text: '#3A5066',
    water: '#C8D8E8',
    parks: '#E0DCC8',
    railway: '#3A5066',
    roadMotorway: '#3A5066',
    roadPrimary: '#5A7088',
    roadSecondary: '#7C92AA',
    roadTertiary: '#A0B4C8',
    roadResidential: '#C0D0DE',
    roadService: '#DCE4ED',
    roadDefault: '#A0B4C8',
    gradientColor: '#F0F4FA',
  },
  {
    id: 'monochrome-pure',
    name: 'Monochrome Pure',
    bg: '#FFFFFF',
    text: '#000000',
    water: '#E8E8E8',
    parks: '#F2F2F2',
    railway: '#000000',
    roadMotorway: '#000000',
    roadPrimary: '#202020',
    roadSecondary: '#454545',
    roadTertiary: '#707070',
    roadResidential: '#9C9C9C',
    roadService: '#C8C8C8',
    roadDefault: '#707070',
    gradientColor: '#FFFFFF',
  },
  {
    id: 'kraft-paper',
    name: 'Kraft Paper',
    bg: '#D4B896',
    text: '#3A2818',
    water: '#A8956C',
    parks: '#B8A874',
    railway: '#3A2818',
    roadMotorway: '#3A2818',
    roadPrimary: '#5A3F28',
    roadSecondary: '#7A5840',
    roadTertiary: '#967058',
    roadResidential: '#B08C70',
    roadService: '#C4A686',
    roadDefault: '#967058',
    gradientColor: '#D4B896',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    bg: '#000000',
    text: '#00FF41',
    water: '#001A0A',
    parks: '#001505',
    railway: '#00FF41',
    roadMotorway: '#00FF41',
    roadPrimary: '#00CC34',
    roadSecondary: '#009928',
    roadTertiary: '#00661B',
    roadResidential: '#003D10',
    roadService: '#002608',
    roadDefault: '#00661B',
    gradientColor: '#000000',
  },
];

export const FONT_FAMILIES: { id: FontFamily; name: string; className: string }[] = [
  { id: 'mono', name: 'Monospace', className: 'font-mono' },
  { id: 'sans', name: 'Sans-Serif', className: 'font-sans' },
  { id: 'serif', name: 'Serif', className: 'font-serif' },
  { id: 'display', name: 'Display', className: 'font-display' },
  { id: 'elegant', name: 'Elegant', className: 'font-elegant' },
  { id: 'condensed', name: 'Condensed', className: 'font-condensed' },
  { id: 'script', name: 'Script', className: 'font-script' },
  { id: 'retro', name: 'Retro', className: 'font-retro' },
  { id: 'minimal', name: 'Minimal', className: 'font-minimal' },
  { id: 'brutalist', name: 'Brutalist', className: 'font-brutalist' },
];

export const TEXT_COLORS: { id: string; name: string; color: string }[] = [
  { id: 'theme', name: 'Theme-Farbe', color: '' },
  { id: 'white', name: 'Weiß', color: '#FFFFFF' },
  { id: 'black', name: 'Schwarz', color: '#1A1A1A' },
  { id: 'gold', name: 'Gold', color: '#D4A853' },
  { id: 'cyan', name: 'Cyan', color: '#00D4FF' },
  { id: 'coral', name: 'Koralle', color: '#FF6B6B' },
  { id: 'sage', name: 'Salbei', color: '#87AE73' },
  { id: 'navy', name: 'Navy', color: '#1B4965' },
  { id: 'terracotta', name: 'Terrakotta', color: '#C04000' },
];

export const FONT_SIZES: { id: FontSize; name: string }[] = [
  { id: 'small', name: 'Klein' },
  { id: 'medium', name: 'Mittel' },
  { id: 'large', name: 'Groß' },
];

export const RENDER_MODES: { id: RenderMode; name: string; description: string }[] = [
  { id: 'vector', name: 'Minimalistisch', description: 'Stilisierte Vektorgrafik' },
];

export const DEFAULT_CONFIG: PosterConfig = {
  posterMode: 'map',
  city: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.405,
  distance: 10000,
  theme: POSTER_THEMES[0],
  width: 12,
  height: 16,
  fontFamily: 'mono',
  fontSize: 'medium',
  fontSizeScale: 1.0,
  orientation: 'vertical',
  aspectRatio: '3:4',
  coloredStreets: false,
  renderMode: 'vector',
  layerVisibility: DEFAULT_LAYER_VISIBILITY,
  layerColors: DEFAULT_LAYER_COLORS,
  showCoordinates: true,
  showCountry: true,
  showCity: true,
  showGradients: true,
  textPosition: 'bottom',
  textLayoutStyle: 'classic',
  mapIcons: [],
  mapImages: [],
  mapRoutes: [],
};
