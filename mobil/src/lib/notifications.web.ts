// The browser preview has no scheduled notifications; see notifications.ts for the phones.
import type { PlannedNotification } from './plan';
import type { SnoozeOption } from './snooze';

export type NotificationAction =
  | { action: 'done' | 'pick' | 'open'; taskId: string; date: string }
  | { action: 'snooze'; option: SnoozeOption; taskId: string; date: string };

export async function setupNotifications(): Promise<void> {}
export async function hasPermission(): Promise<boolean> {
  return false;
}
export async function askPermission(): Promise<boolean> {
  return false;
}
export async function openExactAlarmSettings(): Promise<void> {}
export async function applyPlan(_plan: PlannedNotification[]): Promise<void> {}
export function onNotificationAction(_handler: (a: NotificationAction) => void): () => void {
  return () => {};
}
