import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const loginSource = await readFile(new URL('../app/login.tsx', import.meta.url), 'utf8');
const authSource = await readFile(new URL('../lib/api/auth.js', import.meta.url), 'utf8');

test('signup asks only for phone and password, then logs straight in', () => {
  // No OTP step anywhere in the signup flow.
  expect(loginSource).not.toMatch(/[Oo]tp|verificationToken/);

  // Only phone and password are validated; everything else is optional.
  const validate = loginSource.slice(
    loginSource.indexOf('const validateRegister'),
    loginSource.indexOf('const handleLogin'),
  );
  for (const optional of ['fullName', 'email', 'gender', 'province', 'address', 'dateOfBirth', 'bloodGroup', 'maritalStatus']) {
    expect(validate).not.toContain(`registerForm.${optional}`);
  }
  expect(validate).toContain('t.pleaseEnterPhone');
  expect(validate).toContain('t.pleaseEnterPassword');

  // Account creation is followed by an automatic login.
  expect(loginSource).toContain('await login(normalizedPhone, password, false);');

  expect(authSource).not.toMatch(/https?:\/\//);
  expect(loginSource).not.toContain('secureStorage');
});
