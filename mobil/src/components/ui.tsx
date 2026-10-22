import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, useTheme } from '../lib/theme';

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: ReactNode }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? t.accent : t.card2, borderColor: active ? t.accent : t.line, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.chipText, { color: active ? t.onAccent : t.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

// `textTransform: 'uppercase'` turns "i" into "I"; Turkish needs "İ".
export function upperTr(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

export function SectionTitle({ children, right, color }: { children: ReactNode; right?: ReactNode; color?: string }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { color: color ?? t.muted }]}>{typeof children === 'string' ? upperTr(children) : children}</Text>
      {right}
    </View>
  );
}

// `style` places the card, `inner` lays out its content. The inner view clips row
// separators to the rounded corners; clipping the outer one would drop the shadow.
export function Card({ children, style, inner }: { children: ReactNode; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, shadowColor: t.shadow }, style]}>
      <View style={[styles.clip, inner]}>{children}</View>
    </View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: t.text }]}>{title}</Text>
      {hint ? <Text style={[styles.emptyHint, { color: t.muted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 15, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  card: {
    borderRadius: radius.card,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  clip: { borderRadius: radius.card, overflow: 'hidden' },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyHint: { fontSize: 15, textAlign: 'center' },
});
