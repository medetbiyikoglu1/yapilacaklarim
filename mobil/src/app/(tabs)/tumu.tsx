import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '../../components/Fab';
import { TaskRow } from '../../components/TaskRow';
import { Card, Empty, SectionTitle } from '../../components/ui';
import { dayName, relativeDay } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { byTime } from '../../lib/tasks';
import { useTheme } from '../../lib/theme';

export default function AllScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, today, complete } = useStore();

  // Every unfinished task under its current date; overdue ones are grouped together.
  const groups = useMemo(() => {
    const open = tasks.filter((x) => !x.done).sort(byTime);
    const m = new Map<string, typeof open>();
    for (const x of open) {
      const k = x.date < today ? 'overdue' : x.date;
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return [...m.entries()];
  }, [tasks, today]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: t.text }]}>Tümü</Text>
        {groups.length === 0 && (
          <Card>
            <Empty title="Hiç iş yok" hint="+ ile ilk işini ekle." />
          </Card>
        )}
        {groups.map(([key, list]) => (
          <View key={key}>
            <SectionTitle color={key === 'overdue' ? t.danger : undefined}>
              {key === 'overdue' ? 'Gecikenler' : `${relativeDay(key, today)} · ${dayName(key)}`}
            </SectionTitle>
            <Card>
              {list.map((x) => (
                <TaskRow key={x.id} task={x} today={today} onComplete={() => complete(x.id)} />
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
      <Fab onPress={() => router.push({ pathname: '/is', params: { date: today } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  title: { fontSize: 30, fontWeight: '800' },
});
