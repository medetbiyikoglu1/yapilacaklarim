import { useColorScheme } from 'react-native';

// Same palette as the web prototype (public/styles.css).
const light = {
  bg: '#F4F3FF',
  card: '#FFFFFF',
  card2: '#F6F5FD',
  text: '#16142B',
  muted: '#77748F',
  line: '#E9E7F5',
  accent: '#5B4CF0',
  accentSoft: '#ECEBFF',
  onAccent: '#FFFFFF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#2F9E63',
  priority: ['transparent', '#9CA3AF', '#5B4CF0', '#F76B15'],
  shadow: 'rgba(22, 20, 43, 0.08)',
};

const dark: typeof light = {
  bg: '#0E0D16',
  card: '#1A1928',
  card2: '#232235',
  text: '#F2F1FA',
  muted: '#9A97B3',
  line: '#2B2A40',
  accent: '#8F84FF',
  accentSoft: '#29264D',
  onAccent: '#FFFFFF',
  danger: '#FF6B6F',
  dangerSoft: '#3A1C22',
  success: '#4CC38A',
  priority: ['transparent', '#6B7280', '#8F84FF', '#FF8A3D'],
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { card: 16, chip: 999, sheet: 24 };
