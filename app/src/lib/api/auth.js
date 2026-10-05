import { clearApiCache, request } from './api';
import { secureStorage } from '../secure-storage';

const TOKEN_KEY = 'auth-token';

export async function login(identifier, secret, mode) {
  const normalized = String(identifier ?? '').trim();
  const body = {
    identifier: normalized,
    mrn: normalized,
    phone: normalized,
    secret,
    password: secret,
    mode,
  };
  const candidates = ['/auth/login', '/login', '/auth/signin'];
  let lastError;

  for (const endpoint of candidates) {
    try {
      return await request(endpoint, {
        method: 'POST',
        body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      lastError = error;
      if (!/^HTTP 404\b/i.test(message)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('HTTP 404 - Login endpoint not found');
}

export async function sendPasswordResetOtp(phone) {
  return request('/auth/password-reset/send', {
    method: 'POST',
    body: { phone },
  });
}

export async function resetPasswordWithOtp(phone, code, newPassword) {
  return request('/auth/password-reset/confirm', {
    method: 'POST',
    body: { phone, code, newPassword },
  });
}

// Signup: WhatsApp code to the phone, then the code + password create the account.
export async function sendSignupCode(phone) {
  return request('/auth/signup/send', { method: 'POST', body: { phone } });
}

export async function confirmSignup(phone, code, password) {
  return request('/auth/signup/confirm', { method: 'POST', body: { phone, code, password } });
}

export async function fetchProfile(token) {
  const candidates = ['/users/me', '/auth/me'];
  let lastError;
  for (const endpoint of candidates) {
    try {
      return await request(endpoint, { method: 'GET' }, token);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      if (!/^HTTP 404\b/i.test(message)) {
        throw error;
      }
    }
  }
  throw lastError ?? new Error('HTTP 404 - Profile endpoint not found');
}

export async function logout(token) {
  return request('/auth/logout', { method: 'POST' }, token);
}

export async function storeToken(token) {
  await secureStorage.setItem(TOKEN_KEY, token);
  await clearApiCache();
}

export async function getToken() {
  return secureStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await Promise.all([
    secureStorage.removeItem(TOKEN_KEY),
    clearApiCache(),
  ]);
}
