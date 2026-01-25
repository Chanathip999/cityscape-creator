export interface PosterTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  water: string;
  parks: string;
  roadMotorway: string;
  roadPrimary: string;
  roadSecondary: string;
  roadTertiary: string;
  roadResidential: string;
  gradientColor: string;
}

export type FontFamily = 'mono' | 'sans' | 'serif' | 'display' | 'elegant' | 'condensed';
export type FontSize = 'small' | 'medium' | 'large';
export type PosterOrientation = 'vertical' | 'horizontal';

export interface PosterConfig {
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
  orientation: PosterOrientation;
  customTextColor?: string; // Optional custom text color override
  coloredStreets?: boolean; // Optional: enable colored vector streets overlay (default: false)
}

export const POSTER_THEMES: PosterTheme[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    bg: '#E8F4F8',
    text: '#1B4965',
    water: '#B8D4E3',
    parks: '#D5E8D4',
    roadMotorway: '#1B4965',
    roadPrimary: '#2D6A8A',
    roadSecondary: '#4A8DAD',
    roadTertiary: '#6AB0D0',
    roadResidential: '#8CC8E0',
    gradientColor: '#E8F4F8',
  },
  {
    id: 'noir',
    name: 'Noir',
    bg: '#0D0D0D',
    text: '#FFFFFF',
    water: '#1A1A1A',
    parks: '#151515',
    roadMotorway: '#FFFFFF',
    roadPrimary: '#D0D0D0',
    roadSecondary: '#A0A0A0',
    roadTertiary: '#707070',
    roadResidential: '#505050',
    gradientColor: '#0D0D0D',
  },
  {
    id: 'beige',
    name: 'Warm Beige',
    bg: '#F5F0E6',
    text: '#4A4035',
    water: '#D8D0C0',
    parks: '#E0E8D8',
    roadMotorway: '#4A4035',
    roadPrimary: '#6A6055',
    roadSecondary: '#8A8075',
    roadTertiary: '#AAA095',
    roadResidential: '#C0B8AD',
    gradientColor: '#F5F0E6',
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    bg: '#0A1628',
    text: '#D4A853',
    water: '#0F1E35',
    parks: '#0C1A2E',
    roadMotorway: '#D4A853',
    roadPrimary: '#B8923F',
    roadSecondary: '#8A6E30',
    roadTertiary: '#5C4A20',
    roadResidential: '#3D3115',
    gradientColor: '#0A1628',
  },
  {
    id: 'copper',
    name: 'Copper Patina',
    bg: '#E8F0ED',
    text: '#2D5249',
    water: '#C5D9D2',
    parks: '#D5E5DE',
    roadMotorway: '#2D5249',
    roadPrimary: '#3D6A5F',
    roadSecondary: '#5A8A7F',
    roadTertiary: '#7AABA0',
    roadResidential: '#9AC8BE',
    gradientColor: '#E8F0ED',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    bg: '#FAF4EE',
    text: '#8B4513',
    water: '#E8DFD5',
    parks: '#E5E8DC',
    roadMotorway: '#A0522D',
    roadPrimary: '#B87333',
    roadSecondary: '#CD853F',
    roadTertiary: '#DEB887',
    roadResidential: '#E8D4C0',
    gradientColor: '#FAF4EE',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#EEF4F0',
    text: '#2F4F4F',
    water: '#C8E0D8',
    parks: '#D5E8DC',
    roadMotorway: '#2F4F4F',
    roadPrimary: '#3D6B5C',
    roadSecondary: '#5A8A7A',
    roadTertiary: '#7AAA9A',
    roadResidential: '#A0C8B8',
    gradientColor: '#EEF4F0',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    bg: '#FAFAFA',
    text: '#1A1A1A',
    water: '#D0D0D0',
    parks: '#E8E8E8',
    roadMotorway: '#1A1A1A',
    roadPrimary: '#333333',
    roadSecondary: '#666666',
    roadTertiary: '#999999',
    roadResidential: '#CCCCCC',
    gradientColor: '#FAFAFA',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#FDF5F0',
    text: '#C04000',
    water: '#F5E8E0',
    parks: '#F0E8DC',
    roadMotorway: '#C04000',
    roadPrimary: '#D06030',
    roadSecondary: '#E08060',
    roadTertiary: '#F0A090',
    roadResidential: '#F8C8B8',
    gradientColor: '#FDF5F0',
  },
  {
    id: 'neon',
    name: 'Neon Cyberpunk',
    bg: '#0A0F1A',
    text: '#00D4FF',
    water: '#0D1520',
    parks: '#0A1218',
    roadMotorway: '#FF00FF',
    roadPrimary: '#00D4FF',
    roadSecondary: '#00A8CC',
    roadTertiary: '#007A99',
    roadResidential: '#004D66',
    gradientColor: '#0A0F1A',
  },
];

export const FONT_FAMILIES: { id: FontFamily; name: string; className: string }[] = [
  { id: 'mono', name: 'Monospace', className: 'font-mono' },
  { id: 'sans', name: 'Sans-Serif', className: 'font-sans' },
  { id: 'serif', name: 'Serif', className: 'font-serif' },
  { id: 'display', name: 'Display', className: 'font-display' },
  { id: 'elegant', name: 'Elegant', className: 'font-elegant' },
  { id: 'condensed', name: 'Condensed', className: 'font-condensed' },
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

export const DEFAULT_CONFIG: PosterConfig = {
  city: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.405,
  distance: 15000,
  theme: POSTER_THEMES[0],
  width: 12,
  height: 16,
  fontFamily: 'mono',
  fontSize: 'medium',
  orientation: 'vertical',
  coloredStreets: false, // Default: use standard map tiles
};
