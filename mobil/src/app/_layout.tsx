import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { StoreProvider } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = useTheme();
  const nav = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...nav, colors: { ...nav.colors, background: t.bg, card: t.card, primary: t.accent, text: t.text, border: t.line } }}>
      <StoreProvider>
        <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: t.bg }, headerTintColor: t.accent, headerTitleStyle: { color: t.text } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="is" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="ayarlar" options={{ title: 'Ayarlar', headerBackTitle: 'Geri' }} />
        </Stack>
        <StatusBar style="auto" />
      </StoreProvider>
    </ThemeProvider>
  );
}
