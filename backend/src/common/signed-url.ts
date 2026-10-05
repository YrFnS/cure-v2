import crypto from 'node:crypto';

// Expiring signed links for private files that the app shows in an <Image> (no auth header),
// e.g. profile photos. The app refreshes the profile on every launch, so links stay fresh.
const TTL_SECONDS = 7 * 24 * 3600;

let devSecret: string | null = null;
function secret() {
  const configured = (process.env.URL_SIGNING_SECRET ?? '').trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('URL_SIGNING_SECRET is missing');
  devSecret ??= crypto.randomBytes(32).toString('hex'); // dev only: links die on restart
  return devSecret;
}

const sign = (file: string, exp: number) =>
  crypto.createHmac('sha256', secret()).update(`${file}\n${exp}`).digest('base64url');

export function signedFileUrl(file: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TTL_SECONDS;
  const base = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
  const query = new URLSearchParams({ f: file, exp: String(exp), sig: sign(file, exp) });
  return `${base}/api/files?${query}`;
}

export function verifySignedFile(file: string, exp: string, sig: string, now = Date.now()): boolean {
  const expiry = Number(exp);
  if (!Number.isInteger(expiry) || expiry * 1000 < now) return false;
  const expected = Buffer.from(sign(file, expiry));
  const given = Buffer.from(String(sig));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
