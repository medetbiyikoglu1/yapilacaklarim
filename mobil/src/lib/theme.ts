import { useColorScheme } from 'react-native';

// Yellow and black. `accent` fills (chips, buttons, selected day) with `onAccent` text on
// top; `tint` is for highlighted text and icons, because yellow text is unreadable on white.
const light = {
  bg: '#F6F5F1',
  card: '#FFFFFF',
  card2: '#F1EFE8',
  text: '#121212',
  muted: '#6E6A60',
  line: '#E6E3DA',
  accent: '#FFD400',
  accentSoft: '#FFF3B8',
  onAccent: '#121212',
  tint: '#121212',
  danger: '#D93636',
  dangerSoft: '#FCE9E9',
  success: '#1F9D55',
  priority: ['transparent', '#A8A29E', '#F5B700', '#E5484D'],
  shadow: 'rgba(18, 18, 18, 0.08)',
};

const dark: typeof light = {
  bg: '#0B0B0B',
  card: '#171717',
  card2: '#232323',
  text: '#F5F4EF',
  muted: '#9A968C',
  line: '#2A2A2A',
  accent: '#FFD400',
  accentSoft: '#3A3100',
  onAccent: '#121212',
  tint: '#FFD400',
  danger: '#FF6B6B',
  dangerSoft: '#3A1C1C',
  success: '#4CC38A',
  priority: ['transparent', '#6B6B6B', '#FFD400', '#FF6B6B'],
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { card: 16, chip: 999, sheet: 24 };
