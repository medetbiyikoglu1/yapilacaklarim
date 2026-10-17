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
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.tasks));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
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

function icon(name) {
  return `<svg><use href="#i-${name}"/></svg>`;
}

function renderBanner() {
  const el = $('#notify-banner');
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const show = (iconName, title, text, plain = false) => {
    el.hidden = false;
    el.className = `banner${plain ? ' plain' : ''}`;
    el.innerHTML = `<span class="banner-icon">${icon(iconName)}</span><div><strong>${title}</strong>${text}</div>`;
  };
  if (isIOS && !isStandalone()) {
    show('share', 'Önce ana ekrana ekle', 'Safari\'de Paylaş düğmesine bas, "Ana Ekrana Ekle"yi seç ve uygulamayı ana ekrandan aç. Bildirimler ancak böyle gelir.');
  } else if (!('Notification' in window) || !('PushManager' in window)) {
    show('bell-off', 'Bildirim desteklenmiyor', 'iPhone\'da iOS 16.4 veya üstü gerekiyor.', true);
  } else if (Notification.permission === 'denied') {
    show('bell-off', 'Bildirimler kapalı', 'Ayarlar > Bildirimler > Yapılacaklarım\'dan açabilirsin.', true);
  } else if (Notification.permission === 'granted' && subId()) {
    el.hidden = true;
  } else {
    show('bell', 'Hatırlatmaları kaçırma', 'İşlerin saati gelince sana bildirim gönderebilmem için izin ver.');
    const btn = document.createElement('button');
    btn.textContent = 'Bildirimleri aç';
    btn.onclick = () => enableNotifications().catch(() => {
      btn.textContent = 'Açılamadı, tekrar dene';
    });
    el.querySelector('div').append(document.createElement('br'), btn);
  }
}

// ---------- Rendering ----------

function pill(iconName, text, cls = '') {
  const el = document.createElement('span');
  el.className = `pill ${cls}`;
  el.innerHTML = iconName ? icon(iconName) : '';
  el.append(text);
  return el;
}

function taskEl(task, dayKey) {
  const day = dayKey || task.date;
  const el = document.createElement('div');
  el.className = `task ${task.priority || 'normal'}${task.done ? ' done' : ''}`;

  const check = document.createElement('button');
  check.className = 'check';
  check.setAttribute('aria-label', task.done ? 'Geri al' : 'Tamamlandı');
  check.innerHTML = icon('check');
  check.onclick = (e) => {
    e.stopPropagation();
    if (task.done) return toggleDone(task.id);
    el.classList.add('done');
    setTimeout(() => el.classList.add('leaving'), 250);
    setTimeout(() => toggleDone(task.id), 500);
  };

  const body = document.createElement('div');
  body.className = 'task-body';
  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;
  body.append(title);

  if (task.note) {
    const note = document.createElement('div');
    note.className = 'task-note';
    note.textContent = task.note;
    body.append(note);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  const late = !task.done && day < today();
  if (state.view !== 'calendar' && day !== today()) meta.append(pill(late ? 'clock' : null, formatDay(day), late ? 'late' : ''));
  if (task.time) meta.append(pill('clock', task.time));
  if (task.repeat && task.repeat !== 'none') meta.append(pill('repeat', REPEAT_LABEL[task.repeat]));
  if (task.priority === 'high') meta.append(pill(null, 'Önemli', 'prio-high'));
  if (Number(task.remindBefore) < 0) meta.append(pill('bell-off', 'Sessiz'));
  if (meta.childNodes.length) body.append(meta);

  el.append(check, body);

  if (!task.done && day <= today()) {
    const snooze = document.createElement('button');
    snooze.className = 'snooze';
    snooze.innerHTML = `Yarın${icon('snooze')}`;
    snooze.setAttribute('aria-label', 'Yarına at');
    snooze.onclick = (e) => {
      e.stopPropagation();
      el.classList.add('leaving');
      setTimeout(() => updateTask(task.id, { date: addDays(today(), 1) }), 250);
    };
    el.append(snooze);
  }

  el.onclick = () => openForm(task);
  return el;
}

function sectionTitle(title, count, cls = '') {
  const h = document.createElement('h2');
  h.className = `section-title ${cls}`;
  h.textContent = title;
  if (count) {
    const c = document.createElement('span');
    c.className = 'count';
    c.textContent = count;
    h.append(c);
  }
  return h;
}

function section(title, tasks, dayKey, cls = '') {
  const frag = document.createDocumentFragment();
  if (!tasks.length) return frag;
  frag.append(sectionTitle(title, tasks.length, cls), ...tasks.map((t) => taskEl(t, dayKey)));
  return frag;
}

function emptyState(emoji, title, text) {
  const p = document.createElement('div');
  p.className = 'empty';
  p.innerHTML = `<span class="emoji">${emoji}</span><strong>${title}</strong>${text}`;
  return p;
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
    root.append(
      doneToday.length
        ? emptyState('🎉', 'Bugünlük hepsi bitti', 'Harika iş çıkardın.')
        : emptyState('☀️', 'Bugün boş', 'Aklına bir şey gelirse + ile hemen ekle.')
    );
  }
  if (upcoming.length) {
    root.append(sectionTitle('Önümüzdeki 7 gün', upcoming.length), ...upcoming.map(([x, k]) => taskEl(x, k)));
  }
  root.append(section('Bugün bitenler', doneToday, t));
}

function renderProgress() {
  const el = $('#progress');
  const t = today();
  const due = state.tasks.filter((x) => !x.done && x.date <= t && (x.date < t || occursOn(x, t))).length;
  const done = state.tasks.filter((x) => (x.done && x.date === t) || (x.lastDoneAt && toKey(new Date(x.lastDoneAt)) === t)).length;
  const total = due + done;
  el.hidden = state.view !== 'today' || total === 0;
  if (el.hidden) return;
  const ratio = done / total;
  el.querySelector('.bar').style.strokeDashoffset = String(113.1 * (1 - ratio));
  $('#progress-text').textContent = `${done}/${total}`;
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

const tasksOn = (key) => state.tasks.filter((x) => (x.done ? x.date === key : occursOn(x, key)));

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
    btn.innerHTML = `<span class="num">${d.getDate()}</span>`;
    const items = tasksOn(key).filter((x) => !x.done);
    if (items.length) {
      const dots = document.createElement('span');
      dots.className = 'dots';
      for (const x of items.slice(0, 3)) {
        const i = document.createElement('i');
        i.className = x.priority || 'normal';
        dots.append(i);
      }
      btn.append(dots);
    }
    btn.onclick = () => {
      state.selected = key;
      renderCalendar();
    };
    grid.append(btn);
  }

  $('#cal-day-title').replaceChildren(...sectionTitle(formatDay(state.selected), tasksOn(state.selected).length).childNodes);
  const list = $('#cal-day-list');
  list.replaceChildren();
  const items = tasksOn(state.selected).sort(byTime);
  if (items.length) list.append(...items.map((x) => taskEl(x, state.selected)));
  else list.append(emptyState('🗓️', 'Bu gün boş', 'Bu güne iş planlamak için + düğmesine bas.'));
}

function renderAll() {
  const root = $('#view-all');
  root.replaceChildren();
  const open = state.tasks.filter((x) => !x.done).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const done = state.tasks.filter((x) => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 30);
  root.append(section('Yapılacaklar', open, null));
  root.append(section('Tamamlananlar', done, null));
  if (!open.length && !done.length) root.append(emptyState('📝', 'Liste boş', 'İlk işini eklemek için + düğmesine bas.'));
}

const TITLES = { today: 'Bugün', calendar: 'Takvim', all: 'Tüm işler' };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function render() {
  document.body.dataset.view = state.view;
  $('#view-title').textContent = TITLES[state.view];
  $('#greeting').textContent = state.view === 'today' ? greeting() : '';
  $('#today-label').textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  for (const v of ['today', 'calendar', 'all']) $(`#view-${v}`).hidden = v !== state.view;
  if (state.view === 'today') renderToday();
  if (state.view === 'calendar') renderCalendar();
  if (state.view === 'all') renderAll();
  renderProgress();
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

function dateForChip(offset) {
  if (offset !== 'weekend') return addDays(today(), Number(offset));
  const d = new Date();
  const toSat = (6 - d.getDay() + 7) % 7;
  return addDays(today(), toSat);
}

function highlightDateChip() {
  for (const b of document.querySelectorAll('#date-chips button')) {
    b.classList.toggle('active', dateForChip(b.dataset.offset) === form.elements.date.value);
  }
}

function openForm(task) {
  state.editingId = task?.id || null;
  form.reset();
  $('#form-title').textContent = task ? 'İşi düzenle' : 'Yeni iş';
  $('#delete-btn').hidden = !task;
  $('#delete-btn').classList.remove('armed');
  $('#delete-btn').textContent = 'İşi sil';
  const values = {
    date: state.view === 'calendar' ? state.selected : today(),
    remindBefore: '0',
    repeat: 'none',
    priority: 'normal',
    ...task,
  };
  for (const [k, v] of Object.entries(values)) {
    const field = form.elements[k];
    if (!field) continue;
    if (field instanceof RadioNodeList) {
      // Older tasks may hold a reminder offset that has no chip; fall back to "on time".
      const match = [...field].find((r) => r.value === String(v));
      (match || field[0]).checked = true;
    } else field.value = v ?? '';
  }
  highlightDateChip();
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

for (const b of document.querySelectorAll('#date-chips button')) {
  b.onclick = () => {
    form.elements.date.value = dateForChip(b.dataset.offset);
    highlightDateChip();
  };
}
form.elements.date.addEventListener('input', highlightDateChip);

// Tapping the dimmed area closes the sheet.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

$('#cancel-btn').onclick = () => dialog.close();
// Two taps to delete: the first arms the button, the second deletes.
$('#delete-btn').onclick = (e) => {
  const btn = e.currentTarget;
  if (!btn.classList.contains('armed')) {
    btn.classList.add('armed');
    btn.textContent = 'Silmek için tekrar dokun';
    return;
  }
  deleteTask(state.editingId);
  dialog.close();
};
$('#add-btn').onclick = () => openForm(null);

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.onclick = () => {
    state.view = btn.dataset.view;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    render();
    window.scrollTo({ top: 0 });
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
