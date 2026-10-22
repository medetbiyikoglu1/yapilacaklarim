import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Fab } from '../../components/Fab';
import { Icon } from '../../components/Icon';
import { DoneRow, TaskRow } from '../../components/TaskRow';
import { Card, Empty, SectionTitle } from '../../components/ui';
import { confirmUndo } from '../../lib/confirm';
import { longDate, todayKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { blankTask, byTime } from '../../lib/tasks';
import { useTheme } from '../../lib/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function TodayScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, completions, settings, today, save, complete, undo, canUndo, postpone, openSnooze } = useStore();
  const [quick, setQuick] = useState('');

  const overdue = useMemo(() => tasks.filter((x) => !x.done && x.date < today).sort(byTime), [tasks, today]);
  const due = useMemo(() => tasks.filter((x) => !x.done && x.date === today).sort(byTime), [tasks, today]);
  const doneToday = useMemo(
    () => completions.filter((c) => todayKey(c.doneAt) === today).sort((a, b) => b.doneAt - a.doneAt),
    [completions, today],
  );

  const total = due.length + overdue.length + doneToday.length;
  const progress = total ? doneToday.length / total : 0;

  const addQuick = () => {
    const title = quick.trim();
    if (!title) return;
    save({ ...blankTask(today), title, persistInterval: settings.persistInterval });
    setQuick('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headText}>
            <Text style={[styles.date, { color: t.muted }]}>{longDate(today)}</Text>
            <Text style={[styles.hello, { color: t.text }]}>{greeting()}</Text>
          </View>
          <Ring progress={progress} label={`${doneToday.length}/${total}`} />
          <Pressable onPress={() => router.push('/ayarlar')} hitSlop={10} accessibilityLabel="Ayarlar" style={styles.gear}>
            <Icon name="gear" color={t.muted} />
          </Pressable>
        </View>

        <Card inner={styles.quick}>
          <Icon name="plus" size={20} color={t.tint} />
          <TextInput
            value={quick}
            onChangeText={setQuick}
            onSubmitEditing={addQuick}
            placeholder="Bugün için hızlı ekle"
            placeholderTextColor={t.muted}
            returnKeyType="done"
            style={[styles.quickInput, { color: t.text }]}
          />
        </Card>

        {overdue.length > 0 && (
          <>
            <SectionTitle color={t.danger}>Gecikenler</SectionTitle>
            <Card>
              {overdue.map((x) => (
                <TaskRow key={x.id} task={x} today={today} onComplete={() => complete(x.id)} onPostpone={() => postpone(x.id)} onSnoozeMenu={() => openSnooze(x.id)} />
              ))}
            </Card>
          </>
        )}

        <SectionTitle>Bugün</SectionTitle>
        <Card>
          {due.length ? (
            due.map((x) => <TaskRow key={x.id} task={x} today={today} onComplete={() => complete(x.id)} onPostpone={() => postpone(x.id)} onSnoozeMenu={() => openSnooze(x.id)} />)
          ) : (
            <Empty title={doneToday.length ? 'Bugünlük hepsi bitti' : 'Bugün boş'} hint={doneToday.length ? 'Eline sağlık.' : 'Yukarıdan hızlıca ya da + ile ayrıntılı ekleyebilirsin.'} />
          )}
        </Card>

        {doneToday.length > 0 && (
          <>
            <SectionTitle>Bugün bitenler</SectionTitle>
            <Card>
              {doneToday.map((c) => (
                <DoneRow key={c.id} title={c.title} onUndo={canUndo(c.id) ? () => confirmUndo(c.title, () => undo(c.id)) : undefined} />
              ))}
            </Card>
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push({ pathname: '/is', params: { date: today } })} />
    </View>
  );
}

function Ring({ progress, label }: { progress: number; label: string }) {
  const t = useTheme();
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ring} accessibilityLabel={`Bugün ${label} tamamlandı`}>
      <Svg width={50} height={50} viewBox="0 0 50 50">
        <Circle cx={25} cy={25} r={r} stroke={t.line} strokeWidth={5} fill="none" />
        <Circle
          cx={25}
          cy={25}
          r={r}
          stroke={t.accent}
          strokeWidth={5}
          fill="none"
          strokeDasharray={`${c * progress} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 25 25)"
        />
      </Svg>
      <Text style={[styles.ringText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headText: { flex: 1 },
  date: { fontSize: 14, fontWeight: '600' },
  hello: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  gear: { padding: 4 },
  ring: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', fontSize: 12, fontWeight: '700' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  quickInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
});
