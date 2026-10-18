import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { relativeDay } from '../lib/dates';
import { isRepeating } from '../lib/tasks';
import { useTheme } from '../lib/theme';
import type { Task } from '../lib/types';
import { Icon } from './Icon';

type Props = {
  task: Task;
  today: string;
  showDate?: boolean;
  // Missing for a later repeat, which cannot be ticked before its turn.
  onComplete?: () => void;
  onPostpone?: () => void;
};

export function TaskRow({ task, today, showDate, onComplete, onPostpone }: Props) {
  const t = useTheme();
  const overdue = task.date < today;
  const meta: { icon: 'clock' | 'repeat' | 'bellRing' | 'cal'; text?: string; color?: string }[] = [];
  if (showDate || overdue) meta.push({ icon: 'cal', text: relativeDay(task.date, today), color: overdue ? t.danger : undefined });
  if (task.time) meta.push({ icon: 'clock', text: task.time });
  if (isRepeating(task)) meta.push({ icon: 'repeat' });
  if (task.persistent) meta.push({ icon: 'bellRing' });

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/is', params: { id: task.id } })}
      style={({ pressed }) => [styles.row, { borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.bar, { backgroundColor: t.priority[task.priority] }]} />
      <Pressable
        onPress={onComplete}
        disabled={!onComplete}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.title} bitti olarak işaretle`}
        style={[styles.check, { borderColor: task.priority >= 2 ? t.priority[task.priority] : t.muted, opacity: onComplete ? 1 : 0.35 }]}
      />
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {task.title}
        </Text>
        {meta.length > 0 && (
          <View style={styles.meta}>
            {meta.map((m, i) => (
              <View key={i} style={styles.metaItem}>
                <Icon name={m.icon} size={13} color={m.color ?? t.muted} />
                {m.text ? <Text style={[styles.metaText, { color: m.color ?? t.muted }]}>{m.text}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </View>
      {onPostpone && (
        <Pressable onPress={onPostpone} hitSlop={8} accessibilityLabel="Yarına at" style={[styles.postpone, { backgroundColor: t.card2 }]}>
          <Text style={[styles.postponeText, { color: t.muted }]}>Yarın</Text>
          <Icon name="snooze" size={14} color={t.muted} />
        </Pressable>
      )}
    </Pressable>
  );
}

export function DoneRow({ title, sub, onUndo }: { title: string; sub?: string; onUndo?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onUndo}
      disabled={!onUndo}
      accessibilityHint={onUndo ? 'Geri almak için dokun' : undefined}
      style={({ pressed }) => [styles.row, { borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.bar} />
      <View style={[styles.check, styles.checkDone, { backgroundColor: t.success, borderColor: t.success }]}>
        <Icon name="check" size={14} color="#fff" strokeWidth={2.6} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, styles.doneTitle, { color: t.muted }]} numberOfLines={2}>
          {title}
        </Text>
        {sub ? <Text style={[styles.metaText, { color: t.muted }]}>{sub}</Text> : null}
      </View>
      {onUndo && (
        <View style={[styles.postpone, { backgroundColor: t.card2 }]}>
          <Icon name="undo" size={14} color={t.muted} />
          <Text style={[styles.postponeText, { color: t.muted }]}>Geri al</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginLeft: 4 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.8 },
  checkDone: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '500' },
  doneTitle: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  postpone: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  postponeText: { fontSize: 13, fontWeight: '500' },
});
