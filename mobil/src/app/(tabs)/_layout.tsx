import { Tabs } from 'expo-router/tabs';

import { Icon } from '../../components/Icon';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <Icon name="sun" color={color} /> }} />
      <Tabs.Screen name="takvim" options={{ title: 'Takvim', tabBarIcon: ({ color }) => <Icon name="cal" color={color} /> }} />
      <Tabs.Screen name="tumu" options={{ title: 'Tümü', tabBarIcon: ({ color }) => <Icon name="list" color={color} /> }} />
    </Tabs>
  );
}
