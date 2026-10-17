import { sendPush } from './webpush.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function subscriptionId(endpoint) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Next occurrence of a repeating reminder, computed in the user's local time
// so "every month on the 15th at 09:00" stays at 09:00 local.
export function nextOccurrence(at, repeat, tzOffset) {
  const shift = tzOffset * 60000;
  const local = new Date(at - shift);
  if (repeat === 'daily') local.setUTCDate(local.getUTCDate() + 1);
  else if (repeat === 'weekly') local.setUTCDate(local.getUTCDate() + 7);
  else if (repeat === 'monthly') local.setUTCMonth(local.getUTCMonth() + 1);
  else return null;
  return local.getTime() + shift;
}

function vapidFrom(env) {
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK),
    subject: env.VAPID_SUBJECT || 'mailto:admin@example.com',
  };
}

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (pathname === '/api/vapid-public-key') {
    return json({ key: env.VAPID_PUBLIC_KEY });
  }

  if (pathname === '/api/subscribe' && request.method === 'POST') {
    const sub = await request.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'bad subscription' }, 400);
    const id = await subscriptionId(sub.endpoint);
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, endpoint, p256dh, auth, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(id) DO UPDATE SET p256dh = ?3, auth = ?4`
    )
      .bind(id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, Date.now())
      .run();
    return json({ id });
  }

  const m = pathname.match(/^\/api\/reminders\/([\w-]+)$/);
  if (m) {
    const subId = url.searchParams.get('sub') || '';
    if (request.method === 'PUT') {
      const r = await request.json();
      if (!r.subId || typeof r.at !== 'number' || !r.title) return json({ error: 'bad reminder' }, 400);
      await env.DB.prepare(
        `INSERT INTO reminders (sub_id, id, at, title, body, repeat, tz_offset) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(sub_id, id) DO UPDATE SET at = ?3, title = ?4, body = ?5, repeat = ?6, tz_offset = ?7`
      )
        .bind(r.subId, m[1], r.at, r.title, r.body || '', r.repeat || 'none', r.tzOffset || 0)
        .run();
      return json({ ok: true });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?1 AND id = ?2').bind(subId, m[1]).run();
      return json({ ok: true });
    }
  }

  if (pathname === '/api/test-push' && request.method === 'POST') {
    const { subId } = await request.json();
    const sub = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?1').bind(subId).first();
    if (!sub) return json({ error: 'unknown subscription' }, 404);
    const status = await sendPush(
      sub,
      JSON.stringify({ title: 'Bildirimler çalışıyor 🎉', body: 'Hatırlatmalar artık buraya gelecek.' }),
      vapidFrom(env)
    );
    return json({ status });
  }

  return json({ error: 'not found' }, 404);
}

async function sendDueReminders(env) {
  const now = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT r.*, s.endpoint, s.p256dh, s.auth FROM reminders r
     JOIN subscriptions s ON s.id = r.sub_id WHERE r.at <= ?1 LIMIT 200`
  )
    .bind(now)
    .all();
  const vapid = vapidFrom(env);

  for (const r of results) {
    const payload = JSON.stringify({ title: r.title, body: r.body || 'Hatırlatma', tag: r.id, url: '/' });
    const status = await sendPush(r, payload, vapid);

    if (status === 404 || status === 410) {
      // Subscription is gone (app removed or permission revoked).
      await env.DB.batch([
        env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?1').bind(r.sub_id),
        env.DB.prepare('DELETE FROM subscriptions WHERE id = ?1').bind(r.sub_id),
      ]);
      continue;
    }

    let next = nextOccurrence(r.at, r.repeat, r.tz_offset);
    while (next !== null && next <= now) next = nextOccurrence(next, r.repeat, r.tz_offset);
    if (next === null) {
      await env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?1 AND id = ?2').bind(r.sub_id, r.id).run();
    } else {
      await env.DB.prepare('UPDATE reminders SET at = ?1 WHERE sub_id = ?2 AND id = ?3').bind(next, r.sub_id, r.id).run();
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDueReminders(env));
  },
};
