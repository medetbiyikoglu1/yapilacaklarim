import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '../../components/Fab';
import { MonthGrid } from '../../components/MonthGrid';
import { DoneRow, TaskRow } from '../../components/TaskRow';
import { Card, Empty, SectionTitle } from '../../components/ui';
import { confirmUndo } from '../../lib/confirm';
import { fromKey, longDate, pad, todayKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { byTime, occursOn } from '../../lib/tasks';
import { useTheme } from '../../lib/theme';

export default function CalendarScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, completions, today, complete, undo, canUndo } = useStore();
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => {
    const d = fromKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const doneByDay = useMemo(() => {
    const m = new Map<string, typeof completions>();
    for (const c of completions) {
      const k = todayKey(c.doneAt);
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return m;
  }, [completions]);

  const dots = (key: string): string[] => {
    const open = tasks.filter((x) => occursOn(x, key));
    const colors = open.sort((a, b) => b.priority - a.priority).map((x) => (x.priority >= 2 ? t.priority[x.priority] : t.tint));
    if (doneByDay.has(key)) colors.push(t.success);
    return colors;
  };

  const dayTasks = tasks.filter((x) => occursOn(x, selected)).sort(byTime);
  const dayDone = (doneByDay.get(selected) ?? []).sort((a, b) => a.doneAt - b.doneAt);
  const time = (ms: number) => {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <Card inner={styles.cal}>
          <MonthGrid
            year={view.year}
            month={view.month}
            selected={selected}
            today={today}
            onSelect={setSelected}
            dots={dots}
            onMonth={(delta) =>
              setView((v) => {
                const d = new Date(v.year, v.month + delta, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
          />
        </Card>

        <SectionTitle>{longDate(selected)}</SectionTitle>
        <Card>
          {dayTasks.map((x) => (
            // Later repeats show the task, but only its current occurrence can be ticked.
            <TaskRow key={x.id} task={x} today={today} onComplete={x.date === selected ? () => complete(x.id) : undefined} />
          ))}
          {dayDone.map((c) => (
            <DoneRow key={c.id} title={c.title} sub={`${time(c.doneAt)} bitti`} onUndo={canUndo(c.id) ? () => confirmUndo(c.title, () => undo(c.id)) : undefined} />
          ))}
          {!dayTasks.length && !dayDone.length && <Empty title="Bu gün boş" hint={selected < today ? 'Bu gün biten bir iş yok.' : '+ ile bu güne iş ekleyebilirsin.'} />}
        </Card>
      </ScrollView>
      <Fab onPress={() => router.push({ pathname: '/is', params: { date: selected < today ? today : selected } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  cal: { padding: 12 },
});
