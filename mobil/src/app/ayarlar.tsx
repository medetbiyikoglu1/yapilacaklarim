import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, ChipRow, SectionTitle } from '../components/ui';
import { askExactAlarms, askPermission, exactAlarmsAllowed, hasPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { KEEP_DONE_DAYS, PERSIST_INTERVALS } from '../lib/types';

const DEFAULT_TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00'];
const PERSIST_COUNTS = [3, 5, 10];

export default function SettingsScreen() {
  const t = useTheme();
  const { settings, updateSettings } = useStore();
  const [notify, setNotify] = useState<boolean | null>(null);
  const [exact, setExact] = useState(true);

  const refresh = () => {
    hasPermission().then(setNotify);
    exactAlarmsAllowed().then(setExact);
  };
  useEffect(refresh, []);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <SectionTitle>Bildirimler</SectionTitle>
      <Card inner={styles.card}>
        <Row
          title="Bildirim izni"
          detail={notify == null ? '' : notify ? 'Açık' : 'Kapalı: hatırlatmalar gelmez'}
          action={notify === false ? 'Aç' : undefined}
          onAction={async () => {
            const ok = await askPermission();
            if (!ok) Linking.openSettings();
            refresh();
          }}
        />
        {Platform.OS === 'android' && (
          <Row
            title="Tam zamanında uyarı"
            detail={exact ? 'Açık' : 'Kapalı: hatırlatmalar birkaç dakika gecikebilir'}
            action={exact ? undefined : 'İzin ver'}
            onAction={async () => {
              await askExactAlarms();
              refresh();
            }}
          />
        )}
      </Card>

      <SectionTitle>Saatsiz işlerin hatırlatma saati</SectionTitle>
      <ChipRow>
        {DEFAULT_TIMES.map((x) => (
          <Chip key={x} label={x} active={settings.defaultTime === x} onPress={() => updateSettings({ defaultTime: x })} />
        ))}
      </ChipRow>

      <SectionTitle>Israrcı hatırlatma</SectionTitle>
      <Text style={[styles.hint, { color: t.muted }]}>Yeni işlerde varsayılan aralık</Text>
      <ChipRow>
        {PERSIST_INTERVALS.map((m) => (
          <Chip key={m} label={m < 60 ? `${m} dk` : '1 saat'} active={settings.persistInterval === m} onPress={() => updateSettings({ persistInterval: m })} />
        ))}
      </ChipRow>
      <Text style={[styles.hint, { color: t.muted, marginTop: 16 }]}>En fazla kaç kez tekrar etsin</Text>
      <ChipRow>
        {PERSIST_COUNTS.map((n) => (
          <Chip key={n} label={`${n} kez`} active={settings.persistMax === n} onPress={() => updateSettings({ persistMax: n })} />
        ))}
      </ChipRow>

      <Text style={[styles.footer, { color: t.muted }]}>
        İşlerin yalnızca bu telefonda saklanır. Biten işler {KEEP_DONE_DAYS / 30} ay sonra silinir.
      </Text>
    </ScrollView>
  );
}

function Row({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.line }]}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.hint, { color: t.muted }]}>{detail}</Text>
      </View>
      {action && (
        <Pressable onPress={onAction} style={[styles.btn, { backgroundColor: t.accent }]}>
          <Text style={[styles.btnText, { color: t.onAccent }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  card: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, marginBottom: 8 },
  flex: { flex: 1 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  btnText: { fontSize: 14, fontWeight: '700' },
  footer: { fontSize: 13, marginTop: 30, textAlign: 'center' },
});
