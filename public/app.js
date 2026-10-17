import { toKey, fromKey, addDays, occursOn, completeTask, reminderAt, DEFAULT_TIME } from './tasks.js';

const STORE_KEY = 'yapilacaklarim.tasks';
const SUB_KEY = 'yapilacaklarim.subId';
const $ = (sel) => document.querySelector(sel);

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const REPEAT_LABEL = { daily: 'her gün', weekly: 'her hafta', monthly: 'her ay' };

const state = {
  tasks: load(),
  view: 'today',
  calMode: 'month',
  selected: toKey(new Date()),
  editingId: null,
};

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.tasks));
}

const today = () => toKey(new Date());

function formatDay(key) {
  const t = today();
  if (key === t) return 'Bugün';
  if (key === addDays(t, 1)) return 'Yarın';
  if (key === addDays(t, -1)) return 'Dün';
  const d = fromKey(key);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

// ---------- Reminders (server side push) ----------

function subId() {
  return localStorage.getItem(SUB_KEY);
}

async function syncReminder(task) {
  const sub = subId();
  if (!sub) return;
  const at = reminderAt(task);
  try {
    if (at === null) {
      await fetch(`/api/reminders/${task.id}?sub=${sub}`, { method: 'DELETE' });
      return;
    }
    const when = task.time || DEFAULT_TIME;
    await fetch(`/api/reminders/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId: sub,
        at,
        title: task.title,
        body: task.note ? `${when} · ${task.note}` : `${formatDay(task.date)} ${when}`,
        repeat: task.repeat || 'none',
        tzOffset: new Date().getTimezoneOffset(),
      }),
    });
  } catch {
    // Offline: the next app open resyncs everything.
  }
}

async function removeReminder(id) {
  const sub = subId();
  if (!sub) return;
  try {
    await fetch(`/api/reminders/${id}?sub=${sub}`, { method: 'DELETE' });
  } catch {}
}

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function enableNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    renderBanner();
    return;
  }
  const reg = await navigator.serviceWorker.ready;
  const { key } = await (await fetch('/api/vapid-public-key')).json();
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) }));
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
  const { id } = await res.json();
  localStorage.setItem(SUB_KEY, id);
  await Promise.all(state.tasks.map(syncReminder));
  await fetch('/api/test-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subId: id }),
  });
  renderBanner();
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function renderBanner() {
  const el = $('#notify-banner');
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  el.hidden = false;
  if (isIOS && !isStandalone()) {
    el.innerHTML =
      '<strong>Bildirim almak için ana ekrana ekle.</strong><br>Safari\'de alttaki Paylaş (□↑) düğmesine bas, "Ana Ekrana Ekle"yi seç, sonra uygulamayı ana ekrandan aç.';
  } else if (!('Notification' in window) || !('PushManager' in window)) {
    el.textContent = 'Bu tarayıcı bildirimleri desteklemiyor. iPhone\'da iOS 16.4 veya üstü gerekiyor.';
  } else if (Notification.permission === 'denied') {
    el.textContent = 'Bildirimler kapalı. Ayarlar > Bildirimler > Yapılacaklarım\'dan açabilirsin.';
  } else if (Notification.permission === 'granted' && subId()) {
    el.hidden = true;
  } else {
    el.innerHTML = '<strong>Hatırlatmaları kaçırma.</strong><br>İşlerin saati gelince sana bildirim gönderebilmem için izin ver.';
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = 'Bildirimleri aç';
    btn.onclick = () => enableNotifications().catch(() => alert('Bildirim açılamadı, biraz sonra tekrar dene.'));
    el.append(document.createElement('br'), btn);
  }
}

// ---------- Rendering ----------

function taskEl(task, dayKey) {
  const el = document.createElement('div');
  const doneToday = task.done;
  el.className = `task ${task.priority || 'normal'}${doneToday ? ' done' : ''}`;

  const check = document.createElement('button');
  check.className = 'check';
  check.setAttribute('aria-label', 'Tamamlandı');
  check.textContent = doneToday ? '✓' : '';
  check.onclick = (e) => {
    e.stopPropagation();
    toggleDone(task.id);
  };

  const body = document.createElement('div');
  body.className = 'task-body';
  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const parts = [];
  const day = dayKey || task.date;
  if (state.view !== 'calendar' && day !== today()) parts.push(formatDay(day));
  if (task.time) parts.push(task.time);
  if (task.repeat && task.repeat !== 'none') parts.push(`🔁 ${REPEAT_LABEL[task.repeat]}`);
  if (Number(task.remindBefore) < 0) parts.push('🔕');
  meta.textContent = parts.join(' · ');
  body.append(title);
  if (parts.length) body.append(meta);
  if (task.note) {
    const note = document.createElement('div');
    note.className = 'task-note';
    note.textContent = task.note;
    body.append(note);
  }
  el.append(check, body);

  if (!task.done && (dayKey || task.date) <= today()) {
    const snooze = document.createElement('button');
    snooze.className = 'snooze';
    snooze.textContent = 'Yarına at';
    snooze.onclick = (e) => {
      e.stopPropagation();
      updateTask(task.id, { date: addDays(today(), 1) });
    };
    el.append(snooze);
  }

  el.onclick = () => openForm(task);
  return el;
}

function section(title, tasks, dayKey, cls = '') {
  const frag = document.createDocumentFragment();
  if (!tasks.length) return frag;
  const h = document.createElement('h2');
  h.className = `section-title ${cls}`;
  h.textContent = title;
  frag.append(h, ...tasks.map((t) => taskEl(t, dayKey)));
  return frag;
}

const byTime = (a, b) => (a.time || DEFAULT_TIME).localeCompare(b.time || DEFAULT_TIME);

function renderToday() {
  const root = $('#view-today');
  root.replaceChildren();
  const t = today();
  const open = state.tasks.filter((x) => !x.done);
  const overdue = open.filter((x) => x.date < t).sort((a, b) => a.date.localeCompare(b.date));
  const todays = open.filter((x) => x.date >= t && occursOn(x, t)).sort(byTime);
  const doneToday = state.tasks.filter((x) => x.done && x.date === t);

  // Each task once, at its first occurrence in the coming week.
  const upcoming = [];
  const seen = new Set(todays.map((x) => x.id));
  for (let i = 1; i <= 7; i++) {
    const k = addDays(t, i);
    for (const x of open.filter((x) => !seen.has(x.id) && occursOn(x, k)).sort(byTime)) {
      seen.add(x.id);
      upcoming.push([x, k]);
    }
  }

  root.append(section('Gecikenler', overdue, null, 'overdue'));
  root.append(section('Bugün', todays, t));
  if (!overdue.length && !todays.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Bugün için iş yok. Eklemek için + düğmesine bas.';
    root.append(p);
  }
  if (upcoming.length) {
    const h = document.createElement('h2');
    h.className = 'section-title';
    h.textContent = 'Önümüzdeki 7 gün';
    root.append(h, ...upcoming.map(([x, k]) => taskEl(x, k)));
  }
  root.append(section('Bugün bitenler', doneToday, t));
}

function calendarDays() {
  const sel = fromKey(state.selected);
  let start;
  let count;
  if (state.calMode === 'week') {
    start = new Date(sel);
    count = 7;
  } else {
    start = new Date(sel.getFullYear(), sel.getMonth(), 1);
    count = 42;
  }
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Pazartesi'den başla
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function renderCalendar() {
  const sel = fromKey(state.selected);
  $('#cal-title').textContent = `${MONTHS[sel.getMonth()]} ${sel.getFullYear()}`;
  const grid = $('#cal-grid');
  grid.replaceChildren();
  const t = today();
  for (const d of calendarDays()) {
    const key = toKey(d);
    const btn = document.createElement('button');
    btn.className = 'cal-day';
    if (state.calMode === 'month' && d.getMonth() !== sel.getMonth()) btn.classList.add('other');
    if (key === t) btn.classList.add('today');
    if (key === state.selected) btn.classList.add('selected');
    btn.textContent = d.getDate();
    const count = state.tasks.filter((x) => (x.done ? x.date === key : occursOn(x, key))).length;
    if (count) {
      const dots = document.createElement('span');
      dots.className = 'dots';
      for (let i = 0; i < Math.min(count, 3); i++) dots.append(document.createElement('i'));
      btn.append(dots);
    }
    btn.onclick = () => {
      state.selected = key;
      renderCalendar();
    };
    grid.append(btn);
  }

  $('#cal-day-title').textContent = formatDay(state.selected);
  const list = $('#cal-day-list');
  list.replaceChildren();
  const items = state.tasks
    .filter((x) => (x.done ? x.date === state.selected : occursOn(x, state.selected)))
    .sort(byTime);
  if (items.length) list.append(...items.map((x) => taskEl(x, state.selected)));
  else {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Bu güne iş planlamak için + düğmesine bas.';
    list.append(p);
  }
}

function renderAll() {
  const root = $('#view-all');
  root.replaceChildren();
  const open = state.tasks.filter((x) => !x.done).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const done = state.tasks.filter((x) => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 30);
  root.append(section('Yapılacaklar', open, null));
  root.append(section('Tamamlananlar', done, null));
  if (!open.length && !done.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Henüz hiç iş eklemedin.';
    root.append(p);
  }
}

const TITLES = { today: 'Bugün', calendar: 'Takvim', all: 'Tüm işler' };

function render() {
  $('#view-title').textContent = TITLES[state.view];
  $('#today-label').textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  for (const v of ['today', 'calendar', 'all']) $(`#view-${v}`).hidden = v !== state.view;
  if (state.view === 'today') renderToday();
  if (state.view === 'calendar') renderCalendar();
  if (state.view === 'all') renderAll();
}

// ---------- Mutations ----------

function updateTask(id, patch) {
  state.tasks = state.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x));
  save();
  render();
  syncReminder(state.tasks.find((x) => x.id === id));
}

function toggleDone(id) {
  const task = state.tasks.find((x) => x.id === id);
  if (task.done) updateTask(id, { done: false, doneAt: null });
  else updateTask(id, completeTask(task, today()));
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((x) => x.id !== id);
  save();
  render();
  removeReminder(id);
}

// ---------- Form ----------

const dialog = $('#task-dialog');
const form = $('#task-form');

function openForm(task) {
  state.editingId = task?.id || null;
  form.reset();
  $('#form-title').textContent = task ? 'İşi düzenle' : 'Yeni iş';
  $('#delete-btn').hidden = !task;
  const values = task || {
    date: state.view === 'calendar' ? state.selected : today(),
    remindBefore: '0',
    repeat: 'none',
    priority: 'normal',
  };
  for (const [k, v] of Object.entries(values)) {
    if (form.elements[k]) form.elements[k].value = v ?? '';
  }
  dialog.showModal();
  if (!task) form.elements.title.focus();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.title = data.title.trim();
  if (!data.title) return;
  if (state.editingId) {
    updateTask(state.editingId, data);
  } else {
    const task = { id: crypto.randomUUID(), done: false, createdAt: Date.now(), ...data };
    state.tasks.push(task);
    save();
    render();
    syncReminder(task);
  }
  dialog.close();
});

$('#cancel-btn').onclick = () => dialog.close();
$('#delete-btn').onclick = () => {
  if (state.editingId && confirm('Bu işi silmek istediğine emin misin?')) {
    deleteTask(state.editingId);
    dialog.close();
  }
};
$('#add-btn').onclick = () => openForm(null);

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.onclick = () => {
    state.view = btn.dataset.view;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  };
});

document.querySelectorAll('.segmented button').forEach((btn) => {
  btn.onclick = () => {
    state.calMode = btn.dataset.mode;
    document.querySelectorAll('.segmented button').forEach((b) => b.classList.toggle('active', b === btn));
    renderCalendar();
  };
});

function moveCalendar(dir) {
  const d = fromKey(state.selected);
  if (state.calMode === 'week') d.setDate(d.getDate() + 7 * dir);
  else d.setMonth(d.getMonth() + dir, 1);
  state.selected = toKey(d);
  renderCalendar();
}
$('#cal-prev').onclick = () => moveCalendar(-1);
$('#cal-next').onclick = () => moveCalendar(1);

// Refresh when the app comes back to the foreground (e.g. a new day started).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
render();
renderBanner();
if (subId()) state.tasks.forEach(syncReminder);
