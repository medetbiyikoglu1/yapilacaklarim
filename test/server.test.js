import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ece from 'http_ece';
import { encryptPayload, b64urlEncode } from '../src/webpush.js';
import { nextOccurrence } from '../src/worker.js';

test('push payload decrypts with a reference aes128gcm implementation', async () => {
  const ua = crypto.createECDH('prime256v1');
  ua.generateKeys();
  const auth = crypto.randomBytes(16);

  const body = await encryptPayload('{"title":"Süt al"}', b64urlEncode(ua.getPublicKey()), b64urlEncode(auth));
  const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
  assert.equal(plain.toString(), '{"title":"Süt al"}');
});

test('repeating reminders keep their local time', () => {
  const tz = -180; // Türkiye, UTC+3
  const at = Date.UTC(2026, 0, 31, 6, 0); // 31 Ocak 09:00 yerel
  assert.equal(nextOccurrence(at, 'daily', tz), Date.UTC(2026, 1, 1, 6, 0));
  assert.equal(nextOccurrence(at, 'weekly', tz), Date.UTC(2026, 1, 7, 6, 0));
  assert.equal(nextOccurrence(Date.UTC(2026, 0, 15, 6, 0), 'monthly', tz), Date.UTC(2026, 1, 15, 6, 0));
  assert.equal(nextOccurrence(at, 'none', tz), null);
});
