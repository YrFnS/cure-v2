import { expect, mock, test } from 'bun:test';

const asyncValues = new Map();
const secureValues = new Map();
const platform = { OS: 'ios' };
let failSecureWrites = false;

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async key => asyncValues.get(key) ?? null,
    setItem: async (key, value) => {
      asyncValues.set(key, value);
    },
    removeItem: async key => {
      asyncValues.delete(key);
    },
    getAllKeys: async () => [...asyncValues.keys()],
    multiRemove: async keys => {
      keys.forEach(key => asyncValues.delete(key));
    },
  },
}));

mock.module('expo-secure-store', () => ({
  getItemAsync: async key => secureValues.get(key) ?? null,
  setItemAsync: async (key, value) => {
    if (failSecureWrites) throw new Error('SecureStore unavailable');
    secureValues.set(key, value);
  },
  deleteItemAsync: async key => {
    secureValues.delete(key);
  },
}));

mock.module('react-native', () => ({ Platform: platform }));

test('persists large state and authenticated offline responses', async () => {
  const { secureStorage } = await import('./secure-storage');
  const largeState = JSON.stringify({ patient: { name: 'مريض'.repeat(500) } });
  await secureStorage.setItem('auth-storage', largeState);
  expect(await secureStorage.getItem('auth-storage')).toBe(largeState);
  expect(secureValues.get('auth-storage')).toStartWith('@chunks:');

  asyncValues.set('pushToken', 'ExponentPushToken[test]');
  expect(await secureStorage.getItem('pushToken')).toBe('ExponentPushToken[test]');
  expect(asyncValues.has('pushToken')).toBe(false);
  expect(secureValues.get('pushToken')).toBe('ExponentPushToken[test]');

  asyncValues.set('legacy-auth', largeState);
  failSecureWrites = true;
  expect(await secureStorage.getItem('legacy-auth')).toBe(largeState);
  expect(asyncValues.get('legacy-auth')).toBe(largeState);
  failSecureWrites = false;

  platform.OS = 'web';
  await secureStorage.setItem('web-auth', largeState);
  expect(await secureStorage.getItem('web-auth')).toBe(largeState);
  expect(asyncValues.get('web-auth')).toBe(largeState);
  platform.OS = 'ios';

  const { request } = await import('./api/api');
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify({ data: { records: [1, 2, 3] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  expect(await request('/records', {}, 'patient-token')).toEqual({ records: [1, 2, 3] });

  globalThis.fetch = mock(async () => {
    throw new Error('network request failed');
  });
  expect(await request('/records', {}, 'patient-token')).toEqual({ records: [1, 2, 3] });
});
