import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Card, Chip, ChipRow, Empty, SectionTitle } from '../../components/ui';
import { REGIONS } from '../../lib/spor';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function SporScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { exercises, addExercise, toggleExercise, removeExercise, resetWorkout } = useStore();
  const [text, setText] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const moves = REGIONS.find((r) => r.name === region)?.moves ?? [];
  const done = exercises.filter((e) => e.done).length;

  const add = () => {
    addExercise(text);
    setText('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: t.text }]}>Spor</Text>

        <Card inner={styles.quick}>
          <Icon name="plus" size={20} color={t.tint} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            submitBehavior="submit"
            placeholder="Hareket ekle (ör. Bench press 3x10)"
            placeholderTextColor={t.muted}
            returnKeyType="done"
            style={[styles.input, { color: t.text }]}
          />
        </Card>

        <SectionTitle>Hangi bölgeyi çalışacaksın?</SectionTitle>
        <ChipRow>
          {REGIONS.map((r) => (
            <Chip key={r.name} label={r.name} active={region === r.name} onPress={() => setRegion(region === r.name ? null : r.name)} />
          ))}
        </ChipRow>
        {region && (
          <Card style={styles.picks}>
            {moves.map((m) => {
              const added = exercises.find((e) => e.name === m);
              return (
                <Pressable
                  key={m}
                  onPress={() => (added ? removeExercise(added.id) : addExercise(m))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!added }}
                  accessibilityLabel={added ? `${m} listeden çıkar` : `${m} ekle`}
                  style={({ pressed }) => [styles.row, { borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.name, { color: t.text }]}>{m}</Text>
                  <View style={[styles.add, { backgroundColor: added ? t.accent : t.card2 }]}>
                    <Icon name={added ? 'check' : 'plus'} size={16} color={added ? t.onAccent : t.tint} strokeWidth={2.4} />
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        <SectionTitle
          right={
            done > 0 ? (
              <Pressable onPress={resetWorkout} hitSlop={8} accessibilityLabel="Tikleri sıfırla">
                <Text style={[styles.reset, { color: t.tint }]}>Sıfırla</Text>
              </Pressable>
            ) : undefined
          }
        >
          {exercises.length ? `Bugünkü antrenman · ${done}/${exercises.length}` : 'Bugünkü antrenman'}
        </SectionTitle>
        <Card>
          {exercises.length ? (
            exercises.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => toggleExercise(e.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: e.done }}
                style={({ pressed }) => [styles.row, { borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={[styles.check, { borderColor: e.done ? t.tint : t.muted, backgroundColor: e.done ? t.tint : 'transparent' }]}>
                  {e.done && <Icon name="check" size={14} color={t.card} strokeWidth={2.6} />}
                </View>
                <Text style={[styles.name, { color: e.done ? t.muted : t.text }, e.done && styles.doneName]} numberOfLines={2}>
                  {e.name}
                </Text>
                <Pressable onPress={() => removeExercise(e.id)} hitSlop={10} accessibilityLabel={`${e.name} sil`}>
                  <Icon name="trash" size={18} color={t.muted} />
                </Pressable>
              </Pressable>
            ))
          ) : (
            <Empty title="Liste boş" hint="Sporda yapacağın hareketleri yukarıdan ekle." />
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 16 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  picks: { marginTop: 12 },
  add: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reset: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 16, fontWeight: '500' },
  doneName: { textDecorationLine: 'line-through' },
});
