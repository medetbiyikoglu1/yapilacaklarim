// VAPID anahtar çifti üretir: `node scripts/gen-vapid.mjs`
const { subtle } = globalThis.crypto;

const keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await subtle.exportKey('raw', keys.publicKey));
const jwk = await subtle.exportKey('jwk', keys.privateKey);
const b64url = (b) => Buffer.from(b).toString('base64url');

console.log('VAPID_PUBLIC_KEY:');
console.log(b64url(raw));
console.log('\nVAPID_PRIVATE_JWK:');
console.log(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }));
