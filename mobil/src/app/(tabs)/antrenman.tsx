import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Card, Empty, SectionTitle } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

// Today's workout, split off the Spor tab: tick moves as you go, reset, save as a program.
export default function WorkoutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { exercises, toggleExercise, removeExercise, resetWorkout, saveProgram } = useStore();
  // Name field for saving the list as a program; null while closed.
  const [saving, setSaving] = useState<string | null>(null);
  const done = exercises.filter((e) => e.done).length;

  // The tab hides when the list empties; leave it for Spor rather than sit on a hidden tab.
  useEffect(() => {
    if (!exercises.length) router.navigate('/spor');
  }, [exercises.length]);

  const store = () => {
    if (!saving?.trim()) return;
    saveProgram(saving);
    setSaving(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: t.text }]}>Antrenman</Text>
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
            <Empty title="Liste boş" hint="Spor sekmesinden hareket ya da program seç." />
          )}
        </Card>

        {exercises.length > 0 &&
          (saving === null ? (
            <Pressable onPress={() => setSaving('')} style={({ pressed }) => [styles.saveBtn, { backgroundColor: t.accent, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.saveText, { color: t.onAccent }]}>Program olarak kaydet</Text>
            </Pressable>
          ) : (
            <Card style={styles.saveCard} inner={styles.quick}>
              <TextInput
                value={saving}
                onChangeText={setSaving}
                onSubmitEditing={store}
                autoFocus
                placeholder="Program adı (ör. Pazartesi göğüs)"
                placeholderTextColor={t.muted}
                returnKeyType="done"
                style={[styles.input, { color: t.text }]}
              />
              <Pressable onPress={() => setSaving(null)} hitSlop={8} accessibilityLabel="Vazgeç">
                <Icon name="close" size={18} color={t.muted} />
              </Pressable>
              <Pressable onPress={store} hitSlop={8} style={[styles.add, { backgroundColor: t.accent }]} accessibilityLabel="Kaydet">
                <Icon name="check" size={16} color={t.onAccent} strokeWidth={2.4} />
              </Pressable>
            </Card>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 4 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  saveBtn: { marginTop: 16, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontSize: 16, fontWeight: '700' },
  saveCard: { marginTop: 16 },
  add: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reset: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 16, fontWeight: '500' },
  doneName: { textDecorationLine: 'line-through' },
});
