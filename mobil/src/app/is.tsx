import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { MonthGrid } from '../components/MonthGrid';
import { Card, Chip, ChipRow } from '../components/ui';
import { addDays, fromKey, longDate, pad, SHORT_DAYS, weekday } from '../lib/dates';
import { useStore } from '../lib/store';
import { blankTask, isRepeating } from '../lib/tasks';
import { useTheme } from '../lib/theme';
import { MAX_REMINDERS, PERSIST_INTERVALS, type Priority, type RepeatKind, type Task } from '../lib/types';

const REPEATS: [RepeatKind, string][] = [
  ['none', 'Yok'],
  ['daily', 'Her gün'],
  ['weekly', 'Her hafta'],
  ['monthly', 'Her ay'],
  ['yearly', 'Her yıl'],
];
const REMINDERS: [number, string][] = [
  [0, 'Zamanında'],
  [10, '10 dk önce'],
  [30, '30 dk önce'],
  [60, '1 saat önce'],
  [1440, '1 gün önce'],
];
const TIMES = ['09:00', '12:00', '18:00', '21:00'];
const PRIORITIES: [Priority, string][] = [
  [0, 'Yok'],
  [1, '!'],
  [2, '!!'],
  [3, '!!!'],
];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// The coming Saturday; next week's when today is already the weekend.
function weekend(today: string): string {
  const d = weekday(today);
  return addDays(today, d === 6 ? 7 : 6 - d);
}

export default function TaskForm() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const { tasks, settings, today, save, remove } = useStore();
  const existing = params.id ? tasks.find((x) => x.id === params.id) : undefined;
  const [task, setTask] = useState<Task>(() => existing ?? { ...blankTask(params.date ?? today), persistInterval: settings.persistInterval });
  const [picker, setPicker] = useState<'none' | 'date' | 'time'>('none');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [view, setView] = useState(() => {
    const d = fromKey(task.date);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const set = (patch: Partial<Task>) => setTask((cur) => ({ ...cur, ...patch }));
  const setDate = (date: string) => set({ date, startDate: date, snoozeUntil: null });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = () => {
    if (!task.title.trim()) return;
    // A changed date or time starts the current occurrence over.
    const moved = existing && (existing.date !== task.date || existing.time !== task.time);
    save({ ...task, title: task.title.trim(), snoozeUntil: moved ? null : task.snoozeUntil });
    close();
  };

  const toggleReminder = (m: number) => {
    const has = task.reminders.includes(m);
    if (has) set({ reminders: task.reminders.filter((x) => x !== m) });
    else if (task.reminders.length < MAX_REMINDERS) set({ reminders: [...task.reminders, m].sort((a, b) => a - b) });
  };

  const toggleWeekday = (d: number) => {
    const cur = task.repeat.weekdays.length ? task.repeat.weekdays : [weekday(task.startDate)];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
    if (next.length) set({ repeat: { ...task.repeat, weekdays: next.sort() } });
  };

  const tomorrow = addDays(today, 1);
  const quickDates: [string, string][] = [
    [today, 'Bugün'],
    [tomorrow, 'Yarın'],
    [weekend(today), 'Hafta sonu'],
    [addDays(today, 7), 'Gelecek hafta'],
  ];
  const customDate = !quickDates.some(([k]) => k === task.date);
  const customTime = task.time != null && !TIMES.includes(task.time);
  const [hour, minute] = (task.time ?? settings.defaultTime).split(':').map(Number);
  const activeWeekdays = task.repeat.weekdays.length ? task.repeat.weekdays : [weekday(task.startDate)];

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.bar, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 8 }]}>
        <Pressable onPress={close} hitSlop={10}>
          <Text style={[styles.barBtn, { color: t.muted }]}>Vazgeç</Text>
        </Pressable>
        <Text style={[styles.barTitle, { color: t.text }]}>{existing ? 'İşi düzenle' : 'Yeni iş'}</Text>
        <Pressable onPress={submit} hitSlop={10} disabled={!task.title.trim()}>
          <Text style={[styles.barBtn, styles.bold, { color: task.title.trim() ? t.tint : t.muted }]}>Kaydet</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <Card inner={styles.inputs}>
          <TextInput
            value={task.title}
            onChangeText={(title) => set({ title })}
            placeholder="Ne yapılacak?"
            placeholderTextColor={t.muted}
            autoFocus={!existing}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={[styles.title, { color: t.text, borderBottomColor: t.line }]}
          />
          <TextInput
            value={task.note}
            onChangeText={(note) => set({ note })}
            placeholder="Not ekle"
            placeholderTextColor={t.muted}
            multiline
            style={[styles.note, { color: t.text }]}
          />
        </Card>

        <Label icon="cal" text={`Tarih · ${longDate(task.date)}`} />
        <ChipRow>
          {quickDates.map(([k, label]) => (
            <Chip key={label} label={label} active={task.date === k && picker !== 'date'} onPress={() => (setDate(k), setPicker('none'))} />
          ))}
          <Chip label="Tarih seç" active={customDate || picker === 'date'} onPress={() => setPicker(picker === 'date' ? 'none' : 'date')} />
        </ChipRow>
        {picker === 'date' && (
          <Card style={styles.pickerBox} inner={styles.picker}>
            <MonthGrid
              year={view.year}
              month={view.month}
              selected={task.date}
              today={today}
              onSelect={(k) => (setDate(k), setPicker('none'))}
              onMonth={(delta) =>
                setView((v) => {
                  const d = new Date(v.year, v.month + delta, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            />
          </Card>
        )}

        <Label icon="clock" text="Saat" />
        <ChipRow>
          <Chip label="Gün boyu" active={task.time == null} onPress={() => (set({ time: null }), setPicker('none'))} />
          {TIMES.map((x) => (
            <Chip key={x} label={x} active={task.time === x} onPress={() => (set({ time: x }), setPicker('none'))} />
          ))}
          <Chip label={customTime ? task.time! : 'Diğer'} active={customTime || picker === 'time'} onPress={() => setPicker(picker === 'time' ? 'none' : 'time')} />
        </ChipRow>
        {picker === 'time' && (
          <Card style={styles.pickerBox} inner={styles.picker}>
            <Text style={[styles.pickerLabel, { color: t.muted }]}>Saat</Text>
            <View style={styles.grid}>
              {Array.from({ length: 24 }, (_, h) => (
                <Cell key={h} label={pad(h)} active={task.time != null && hour === h} onPress={() => set({ time: `${pad(h)}:${pad(task.time ? minute : 0)}` })} />
              ))}
            </View>
            <Text style={[styles.pickerLabel, { color: t.muted }]}>Dakika</Text>
            <View style={styles.grid}>
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                <Cell key={m} label={pad(m)} active={task.time != null && minute === m} onPress={() => set({ time: `${pad(hour)}:${pad(m)}` })} />
              ))}
            </View>
          </Card>
        )}

        <Label icon="repeat" text="Tekrar" />
        <ChipRow>
          {REPEATS.map(([kind, label]) => (
            <Chip key={kind} label={label} active={task.repeat.kind === kind} onPress={() => set({ repeat: { kind, weekdays: [] }, startDate: task.date })} />
          ))}
        </ChipRow>
        {task.repeat.kind === 'weekly' && (
          <View style={[styles.week, { marginTop: 10 }]}>
            {WEEK_ORDER.map((d) => (
              <Cell key={d} label={SHORT_DAYS[d]} active={activeWeekdays.includes(d)} onPress={() => toggleWeekday(d)} />
            ))}
          </View>
        )}

        <Label icon="bell" text={`Hatırlatma${task.reminders.length ? ` · en fazla ${MAX_REMINDERS}` : ' yok'}`} />
        <ChipRow>
          {REMINDERS.map(([m, label]) => (
            <Chip key={m} label={label} active={task.reminders.includes(m)} onPress={() => toggleReminder(m)} />
          ))}
        </ChipRow>
        {task.time == null && task.reminders.length > 0 && (
          <Text style={[styles.hint, { color: t.muted }]}>{`Saat seçmezsen ${settings.defaultTime} saatinde hatırlatırım.`}</Text>
        )}

        <Card style={styles.persistBox} inner={styles.persist}>
          <View style={styles.persistHead}>
            <View style={styles.flex}>
              <Text style={[styles.persistTitle, { color: t.text }]}>Israrcı hatırlatma</Text>
              <Text style={[styles.hint, { color: t.muted, marginTop: 2 }]}>Bitti diyene kadar {settings.persistMax} kez daha uyarır.</Text>
            </View>
            <Switch
              value={task.persistent}
              onValueChange={(persistent) => set({ persistent, reminders: persistent && !task.reminders.length ? [0] : task.reminders })}
              trackColor={{ true: t.accent, false: t.line }}
              thumbColor="#FFFFFF"
            />
          </View>
          {task.persistent && (
            <ChipRow>
              {PERSIST_INTERVALS.map((m) => (
                <Chip key={m} label={m < 60 ? `${m} dk` : '1 saat'} active={task.persistInterval === m} onPress={() => set({ persistInterval: m })} />
              ))}
            </ChipRow>
          )}
        </Card>

        <Label icon="list" text="Öncelik" />
        <ChipRow>
          {PRIORITIES.map(([p, label]) => (
            <Chip key={p} label={label} active={task.priority === p} onPress={() => set({ priority: p })} />
          ))}
        </ChipRow>

        {existing && (
          <Pressable
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              remove(existing.id);
              close();
            }}
            style={[styles.delete, { backgroundColor: t.dangerSoft }]}
          >
            <Icon name="trash" size={18} color={t.danger} />
            <Text style={[styles.deleteText, { color: t.danger }]}>
              {confirmDelete ? 'Silmek için tekrar dokun' : isRepeating(existing) ? 'Tekrarlayan işi sil' : 'İşi sil'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ icon, text }: { icon: 'cal' | 'clock' | 'repeat' | 'bell' | 'list'; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.label}>
      <Icon name={icon} size={16} color={t.muted} />
      <Text style={[styles.labelText, { color: t.muted }]}>{text}</Text>
    </View>
  );
}

function Cell({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.cell, { backgroundColor: active ? t.accent : t.card2 }]}>
      <Text style={[styles.cellText, { color: active ? t.onAccent : t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
  barTitle: { fontSize: 17, fontWeight: '700' },
  barBtn: { fontSize: 17 },
  bold: { fontWeight: '700' },
  content: { paddingHorizontal: 16 },
  inputs: { paddingHorizontal: 16 },
  title: { fontSize: 19, fontWeight: '600', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  note: { fontSize: 15, paddingVertical: 12, minHeight: 44 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, marginBottom: 10 },
  labelText: { fontSize: 14, fontWeight: '600' },
  pickerBox: { marginTop: 10 },
  picker: { padding: 12 },
  pickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  week: { flexDirection: 'row', gap: 6 },
  cell: { minWidth: 42, paddingVertical: 9, borderRadius: 10, alignItems: 'center', flexGrow: 1 },
  cellText: { fontSize: 15, fontWeight: '500' },
  hint: { fontSize: 13, marginTop: 8 },
  persistBox: { marginTop: 22 },
  persist: { padding: 16, gap: 12 },
  persistHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  persistTitle: { fontSize: 16, fontWeight: '600' },
  flex: { flex: 1 },
  delete: { marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  deleteText: { fontSize: 16, fontWeight: '600' },
});
