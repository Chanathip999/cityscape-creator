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
};
