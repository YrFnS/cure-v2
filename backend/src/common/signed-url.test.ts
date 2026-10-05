import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signedFileUrl, verifySignedFile } from './signed-url';

test('signed file links: valid, tampered, expired', () => {
  process.env.URL_SIGNING_SECRET = 'test-secret';
  const url = new URL(signedFileUrl('avatars/a.jpg', 0), 'http://x');
  const [f, exp, sig] = ['f', 'exp', 'sig'].map(k => url.searchParams.get(k)!);
  assert.ok(verifySignedFile(f, exp, sig, 0));
  assert.ok(!verifySignedFile('avatars/b.jpg', exp, sig, 0)); // other file
  assert.ok(!verifySignedFile(f, String(Number(exp) + 1), sig, 0)); // extended expiry
  assert.ok(!verifySignedFile(f, exp, sig, (Number(exp) + 1) * 1000)); // expired
});
