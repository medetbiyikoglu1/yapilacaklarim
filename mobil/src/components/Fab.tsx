import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../lib/theme';
import { Icon } from './Icon';

export function Fab({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Yeni iş"
      style={({ pressed }) => [styles.fab, { backgroundColor: t.accent, shadowColor: t.accent, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <Icon name="plus" size={28} color={t.onAccent} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
});
