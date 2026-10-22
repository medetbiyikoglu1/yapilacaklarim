import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SNOOZE_LABELS } from '../lib/snooze';
import { useStore } from '../lib/store';
import { radius, useTheme } from '../lib/theme';
import { Icon } from './Icon';

// Bottom sheet with every snooze choice. Opened by "Ertele…" on an Android notification
// and by a long press on a row's "Yarın" button.
export function SnoozeSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { snoozing, snooze, closeSnooze } = useStore();

  return (
    <Modal visible={!!snoozing} transparent animationType="slide" onRequestClose={closeSnooze}>
      <Pressable style={styles.backdrop} onPress={closeSnooze} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 12 }]}>
        <Text style={[styles.label, { color: t.muted }]}>Ertele</Text>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {snoozing?.task.title}
        </Text>
        {snoozing?.options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            onPress={() => {
              if (snoozing) snooze(snoozing.task.id, o);
              closeSnooze();
            }}
            style={({ pressed }) => [styles.option, { borderTopColor: t.line, opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name={o === 'morning' ? 'sun' : 'clock'} size={20} color={t.tint} />
            <Text style={[styles.optionText, { color: t.text }]}>{SNOOZE_LABELS[o]}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 18, paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', marginTop: 2, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 17, fontWeight: '500' },
});
