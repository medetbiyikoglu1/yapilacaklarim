import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysInMonth, monthName, SHORT_DAYS, toKey } from '../lib/dates';
import { useTheme } from '../lib/theme';
import { Icon } from './Icon';

type Props = {
  year: number;
  month: number;
  selected: string;
  today: string;
  onSelect: (key: string) => void;
  onMonth: (delta: number) => void;
  dots?: (key: string) => string[];
};

// Weeks start on Monday.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function MonthGrid({ year, month, selected, today, onSelect, onMonth, dots }: Props) {
  const t = useTheme();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(toKey(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  // Explicit rows: percentage widths in a wrapping row can round past 100% on iOS
  // and push Sunday onto the next line.
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.head}>
        <Pressable onPress={() => onMonth(-1)} hitSlop={10} accessibilityLabel="Önceki ay" style={styles.nav}>
          <Icon name="left" size={20} color={t.text} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>
          {monthName(month)} {year}
        </Text>
        <Pressable onPress={() => onMonth(1)} hitSlop={10} accessibilityLabel="Sonraki ay" style={styles.nav}>
          <Icon name="right" size={20} color={t.text} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {ORDER.map((d) => (
          <Text key={d} style={[styles.weekday, { color: t.muted }]}>
            {SHORT_DAYS[d]}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((key, i) => {
            if (!key) return <View key={i} style={styles.cell} />;
            const isSel = key === selected;
            const isToday = key === today;
            const marks = dots?.(key) ?? [];
            return (
              <Pressable key={key} onPress={() => onSelect(key)} style={styles.cell} accessibilityLabel={key}>
                <View style={[styles.day, isSel && { backgroundColor: t.accent }, !isSel && isToday && { backgroundColor: t.accentSoft }]}>
                  <Text style={[styles.dayText, { color: isSel ? t.onAccent : isToday ? t.tint : key < today ? t.muted : t.text }, (isSel || isToday) && styles.bold]}>
                    {Number(key.slice(8))}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {marks.slice(0, 3).map((c, j) => (
                    <View key={j} style={[styles.dot, { backgroundColor: c }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  nav: { padding: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3, height: 50 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16 },
  bold: { fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
