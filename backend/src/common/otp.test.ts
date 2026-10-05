import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isIraqiMobile, normalizeIraqiPhone } from './auth';
import { OtpStore } from './otp';

test('otp: right code once, then gone', () => {
  const store = new OtpStore();
  const code = store.issue('signup:07700000000');
  store.consume('signup:07700000000', code);
  assert.throws(() => store.consume('signup:07700000000', code));
});

test('otp: wrong codes lock out after five', () => {
  const store = new OtpStore();
  const code = store.issue('k');
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.throws(() => store.consume('k', wrong));
  assert.throws(() => store.consume('k', code)); // locked even with the right code
});

test('otp: expired code is rejected', () => {
  const store = new OtpStore();
  const code = store.issue('k', 0);
  assert.throws(() => store.consume('k', code, 6 * 60 * 1000));
});

test('otp: send limit is 3 per 15 minutes', () => {
  const store = new OtpStore();
  for (let i = 0; i < 3; i++) store.issue('k', 1000);
  assert.throws(() => store.issue('k', 1000));
  store.issue('k', 1000 + 16 * 60 * 1000);
});

test('phone normalization', () => {
  assert.equal(normalizeIraqiPhone('+964 770 123 4567'), '07701234567');
  assert.equal(normalizeIraqiPhone('٠٧٧٠١٢٣٤٥٦٧'), '07701234567');
  assert.equal(normalizeIraqiPhone('7701234567'), '07701234567');
  assert.ok(isIraqiMobile('07701234567'));
  assert.ok(!isIraqiMobile('0770123'));
});
