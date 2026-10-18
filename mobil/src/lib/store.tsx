import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { todayKey } from './dates';
import { applyPlan, askPermission, onNotificationAction, setupNotifications, type NotificationAction } from './notifications';
import { planNotifications } from './plan';
import * as storage from './storage';
import { canUndo as canUndoCompletion, completeTask, moveToTomorrow, uncompleteTask } from './tasks';
import { KEEP_DONE_DAYS, type Completion, type Settings, type Task } from './types';

type Store = {
  tasks: Task[];
  completions: Completion[];
  settings: Settings;
  today: string;
  save: (task: Task) => void;
  remove: (id: string) => void;
  complete: (id: string) => void;
  undo: (completionId: string) => void;
  canUndo: (completionId: string) => boolean;
  postpone: (id: string) => void;
  snooze: (id: string, minutes: number) => void;
  updateSettings: (s: Partial<Settings>) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    storage.purgeBefore(Date.now() - KEEP_DONE_DAYS * 86400000);
    return storage.loadAll();
  });
  const [tasks, setTasks] = useState(initial.tasks);
  const [completions, setCompletions] = useState(initial.completions);
  const [settings, setSettings] = useState(initial.settings);
  const [today, setToday] = useState(todayKey());

  // Latest state for callbacks that outlive a render (notification taps).
  const ref = useRef({ tasks, completions, settings });
  useLayoutEffect(() => {
    ref.current = { tasks, completions, settings };
  });

  const reschedule = useCallback(() => {
    const { tasks, settings } = ref.current;
    applyPlan(planNotifications(tasks, settings, Date.now()));
  }, []);

  useEffect(reschedule, [tasks, settings, reschedule]);

  const putTask = useCallback((task: Task) => {
    storage.saveTask(task);
    setTasks((all) => [...all.filter((t) => t.id !== task.id), task]);
  }, []);

  const save = useCallback(
    (task: Task) => {
      putTask(task);
      if (task.reminders.length) askPermission().then((ok) => ok && reschedule());
    },
    [putTask, reschedule],
  );

  const remove = useCallback((id: string) => {
    storage.deleteTask(id);
    setTasks((all) => all.filter((t) => t.id !== id));
    setCompletions((all) => all.filter((c) => c.taskId !== id));
  }, []);

  const complete = useCallback(
    (id: string) => {
      const task = ref.current.tasks.find((t) => t.id === id);
      if (!task || task.done) return;
      const { task: next, completion } = completeTask(task, Date.now());
      storage.saveCompletion(completion);
      setCompletions((all) => [...all, completion]);
      putTask(next);
    },
    [putTask],
  );

  const undo = useCallback(
    (completionId: string) => {
      const completion = ref.current.completions.find((c) => c.id === completionId);
      if (!completion) return;
      storage.deleteCompletion(completionId);
      setCompletions((all) => all.filter((c) => c.id !== completionId));
      const task = ref.current.tasks.find((t) => t.id === completion.taskId);
      if (task) putTask(uncompleteTask(task, completion));
    },
    [putTask],
  );

  const canUndo = useCallback(
    (completionId: string) => {
      const c = completions.find((x) => x.id === completionId);
      return !!c && canUndoCompletion(c, tasks, completions);
    },
    [tasks, completions],
  );

  const postpone = useCallback(
    (id: string) => {
      const task = ref.current.tasks.find((t) => t.id === id);
      if (task) putTask(moveToTomorrow(task, Date.now()));
    },
    [putTask],
  );

  const snooze = useCallback(
    (id: string, minutes: number) => {
      const task = ref.current.tasks.find((t) => t.id === id);
      if (task) putTask({ ...task, snoozeUntil: Date.now() + minutes * 60000 });
    },
    [putTask],
  );

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((cur) => {
      const next = { ...cur, ...s };
      storage.saveSettings(next);
      return next;
    });
  }, []);

  // Notification buttons. A tap on an older occurrence than the task's current one is stale.
  useEffect(() => {
    const handle = (a: NotificationAction) => {
      const task = ref.current.tasks.find((t) => t.id === a.taskId);
      if (!task) return;
      if (a.action === 'done' && task.date === a.date) complete(task.id);
      else if (a.action === 'snooze' && task.date === a.date) snooze(task.id, 60);
      else if (a.action === 'open') router.push({ pathname: '/is', params: { id: task.id } });
    };
    let off = () => {};
    setupNotifications()
      .then(() => {
        off = onNotificationAction(handle);
        reschedule();
      })
      .catch((e) => console.warn('Bildirim kurulumu', e));
    return () => off();
  }, [complete, snooze, reschedule]);

  // Coming back to the app: the day may have changed and fired reminders need replacing.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setToday(todayKey());
      reschedule();
    });
    const tick = setInterval(() => setToday(todayKey()), 60000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, [reschedule]);

  const value = useMemo(
    () => ({ tasks, completions, settings, today, save, remove, complete, undo, canUndo, postpone, snooze, updateSettings }),
    [tasks, completions, settings, today, save, remove, complete, undo, canUndo, postpone, snooze, updateSettings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
