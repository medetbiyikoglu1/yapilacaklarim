import { Tabs } from 'expo-router/tabs';

import { Icon } from '../../components/Icon';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const t = useTheme();
  const { showSpor, exercises } = useStore();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.tint,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <Icon name="sun" color={color} /> }} />
      <Tabs.Screen name="takvim" options={{ title: 'Takvim', tabBarIcon: ({ color }) => <Icon name="cal" color={color} /> }} />
      <Tabs.Screen name="tumu" options={{ title: 'Tümü', tabBarIcon: ({ color }) => <Icon name="list" color={color} /> }} />
      {/* Appears only while a task mentions "spor"; the list is kept while hidden. */}
      <Tabs.Screen
        name="spor"
        options={{ title: 'Spor', href: showSpor ? undefined : null, tabBarIcon: ({ color }) => <Icon name="dumbbell" color={color} /> }}
      />
      {/* Today's workout gets its own tab once something is on the list. */}
      <Tabs.Screen
        name="antrenman"
        options={{ title: 'Antrenman', href: showSpor && exercises.length ? undefined : null, tabBarIcon: ({ color }) => <Icon name="check" color={color} /> }}
      />
    </Tabs>
  );
}
