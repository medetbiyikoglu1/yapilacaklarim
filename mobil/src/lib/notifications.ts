import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { CATEGORY_LATE, CATEGORY_TASK, type PlannedNotification } from './plan';
import { SNOOZE_LABELS, type SnoozeOption } from './snooze';

export const ACTION_DONE = 'done';
// "snooze" was the only snooze button before and still means an hour on old notifications.
const SNOOZE_ACTIONS: Record<string, SnoozeOption> = {
  snooze15: '15m',
  snooze: '1h',
  evening: 'evening',
  morning: 'morning',
};
const ACTION_PICK = 'pick';
const CHANNEL = 'hatirlatmalar';

export type NotificationAction =
  | { action: 'done' | 'pick' | 'open'; taskId: string; date: string }
  | { action: 'snooze'; option: SnoozeOption; taskId: string; date: string };

// Every button opens the app: a background action is dropped when iOS has killed the app.
function button(identifier: string, buttonTitle: string): Notifications.NotificationAction {
  return { identifier, buttonTitle, options: { opensAppToForeground: true } };
}

function snoozeButton(option: SnoozeOption): Notifications.NotificationAction {
  const id = Object.keys(SNOOZE_ACTIONS).find((k) => SNOOZE_ACTIONS[k] === option)!;
  return button(id, SNOOZE_LABELS[option]);
}

// Android shows at most three buttons, so the other choices sit behind "Ertele…".
function buttons(evening: boolean): Notifications.NotificationAction[] {
  if (Platform.OS === 'android') return [button(ACTION_DONE, 'Bitti'), snoozeButton('1h'), button(ACTION_PICK, 'Ertele…')];
  const options: SnoozeOption[] = evening ? ['15m', '1h', 'evening', 'morning'] : ['15m', '1h', 'morning'];
  return [button(ACTION_DONE, 'Bitti'), ...options.map(snoozeButton)];
}

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  await Notifications.setNotificationCategoryAsync(CATEGORY_TASK, buttons(true));
  await Notifications.setNotificationCategoryAsync(CATEGORY_LATE, buttons(false));
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
          categoryIdentifier: n.category,
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
  const { taskId, date } = data;
  const id = response.actionIdentifier;
  if (id === ACTION_DONE) return { action: 'done', taskId, date };
  if (id === ACTION_PICK) return { action: 'pick', taskId, date };
  if (id in SNOOZE_ACTIONS) return { action: 'snooze', option: SNOOZE_ACTIONS[id], taskId, date };
  return { action: 'open', taskId, date };
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
