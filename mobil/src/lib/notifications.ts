import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { PlannedNotification } from './plan';

export const CATEGORY = 'task';
export const ACTION_DONE = 'done';
export const ACTION_SNOOZE = 'snooze';
const CHANNEL = 'hatirlatmalar';

export type NotificationAction = { action: 'done' | 'snooze' | 'open'; taskId: string; date: string };

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  // Both buttons open the app: a background action is dropped when iOS has killed the app.
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: 'Bitti', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: '1 saat ertele', options: { opensAppToForeground: true } },
  ]);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Hatırlatmalar',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

// Asks once; later calls only report the answer.
export async function askPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) return current.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Android 14+ delays reminders by minutes unless the user allows exact alarms
// ("Alarmlar ve hatırlatıcılar"). This SDK cannot read that setting, so we only open it.
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  } catch {
    await Linking.openSettings();
  }
}

let queue = Promise.resolve();

// Replaces everything the phone has scheduled with `plan`. Calls run one after another.
export function applyPlan(plan: PlannedNotification[]): Promise<void> {
  queue = queue.then(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await hasPermission())) return;
    for (const n of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          sound: 'default',
          categoryIdentifier: CATEGORY,
          data: { taskId: n.taskId, date: n.date },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL },
      });
    }
  }).catch((e) => console.warn('Bildirimler planlanamadı', e));
  return queue;
}

function toAction(response: Notifications.NotificationResponse): NotificationAction | null {
  const data = response.notification.request.content.data as { taskId?: string; date?: string } | undefined;
  if (!data?.taskId || !data.date) return null;
  const action = response.actionIdentifier === ACTION_DONE ? 'done' : response.actionIdentifier === ACTION_SNOOZE ? 'snooze' : 'open';
  return { action, taskId: data.taskId, date: data.date };
}

// Calls `handler` for the tap that launched the app and for every later one.
export function onNotificationAction(handler: (a: NotificationAction) => void): () => void {
  const seen = new Set<string>();
  const handle = (r: Notifications.NotificationResponse | null) => {
    if (!r) return;
    const key = `${r.notification.request.identifier}|${r.actionIdentifier}|${r.notification.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    const a = toAction(r);
    if (a) handler(a);
    Notifications.clearLastNotificationResponse();
  };
  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
