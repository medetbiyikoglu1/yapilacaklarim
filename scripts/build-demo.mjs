// Tek dosyalık demo sayfası üretir (bildirimsiz, örnek işlerle): `node scripts/build-demo.mjs`
// Çıktı: dist/demo.html. Sunucu ve bildirim olmadan arayüzü denemek için.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8');

function replaceOnce(src, from, to) {
  if (!src.includes(from)) throw new Error(`build-demo: "${from.slice(0, 40)}..." bulunamadı`);
  return src.replace(from, to);
}

const html = read('index.html');
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script type="module" src="\/app.js"><\/script>/, '');

const tasks = read('tasks.js').replace(/^export /gm, '');

let app = read('app.js').replace(/^import .*\n/m, '');
app = replaceOnce(app, "if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');\n", '');
app = replaceOnce(app, 'render();\nrenderBanner();', 'seedExamples();\nrender();\nshowDemoBanner();');

const demo = `
function seedExamples() {
  if (state.tasks.length) return;
  const t = today();
  const ex = (title, date, extra = {}) => ({
    id: crypto.randomUUID(), title, date, time: '', note: '', remindBefore: '0', repeat: 'none',
    priority: 'normal', done: false, createdAt: Date.now(), ...extra,
  });
  state.tasks = [
    ex('Annemi ara', addDays(t, -1)),
    ex('İlacını al', t, { time: '09:00', repeat: 'daily' }),
    ex('Elektrik faturasını öde', t, { time: '18:00', priority: 'high', note: 'Son ödeme günü bugün' }),
    ex('Market alışverişi', t, { done: true, doneAt: Date.now() }),
    ex('Diş randevusu', addDays(t, 2), { time: '14:30', remindBefore: '60' }),
    ex('Spor salonu', addDays(t, 1), { time: '19:00', repeat: 'weekly' }),
    ex('Kira', addDays(t, 5), { repeat: 'monthly', priority: 'high' }),
  ];
  save();
}

function showDemoBanner() {
  const el = $('#notify-banner');
  el.hidden = false;
  el.className = 'banner plain';
  el.innerHTML = '<span class="banner-icon">' + icon('bell') + '</span><div><strong>Deneme sürümü</strong>' +
    'Listedeki işler örnek. Ekleyip silebilir, takvimde gezinebilirsin. Bildirimler gerçek kurulumda gelir.</div>';
}
`;

const page = `<title>Yapılacaklarım</title>
<style>
${read('styles.css')}
</style>
${body}
<script>
${tasks}
${app}
${demo}
</script>
`;

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/demo.html', import.meta.url), page);
console.log('dist/demo.html yazıldı');
