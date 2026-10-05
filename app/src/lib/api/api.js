import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { secureStorage } from '../secure-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');
const inferFrappeBaseUrl = () => {
  try {
    const inferred = new URL(API_BASE_URL);
    if (inferred.port === '3000') {
      inferred.port = '8000';
    }
    if (!inferred.port) {
      inferred.port = '8000';
    }
    inferred.pathname = '';
    inferred.search = '';
    inferred.hash = '';
    return inferred.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};
const FRAPPE_BASE_URL = ((process.env.EXPO_PUBLIC_FRAPPE_BASE_URL || '').trim() || inferFrappeBaseUrl()).replace(/\/$/, '');
const LEGACY_API_CACHE_PREFIX = 'mrn-api-cache-v1:';
const API_CACHE_PREFIX = 'mrn-api-cache-v2';
const API_CACHE_INDEX = `${API_CACHE_PREFIX}-index`;
const API_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours
let cacheMutation = Promise.resolve();
let legacyCacheCleanup;

function compactApiErrorMessage(data, status) {
  const rawParts = [
    data?.message?.message,
    data?.message,
    data?.details?.message,
    data?.exception,
    data?.error,
  ]
    .filter(Boolean)
    .map(value => String(value));

  const raw = rawParts.join(' ');
  if (!raw) return `HTTP ${status} - Request failed`;

  if (/User already exists/i.test(raw)) return `HTTP ${status} - البريد الإلكتروني مستخدم مسبقاً`;
  if (/Duplicate entry .*mobile_no/i.test(raw) || /Mobile No must be unique/i.test(raw)) {
    return `HTTP ${status} - رقم الهاتف مستخدم مسبقاً`;
  }
  if (/Field not permitted in query/i.test(raw)) {
    return `HTTP ${status} - خطأ إعداد في الخادم (حقل غير مسموح)`;
  }
  if (/MRN was not generated/i.test(raw)) {
    return `HTTP ${status} - لم يتم توليد رقم MRN، أعد المحاولة`;
  }
  if (/OverlapError|cannot overlap appointment/i.test(raw)) {
    return `HTTP ${status} - هذا الوقت محجوز مسبقاً، اختر وقتاً آخر.`;
  }
  if (/Only MRN\/username or Iraqi phone is allowed/i.test(raw)) {
    return `HTTP ${status} - تسجيل الدخول مسموح فقط عبر MRN/اسم المستخدم أو رقم الهاتف`;
  }

  const concise =
    data?.message?.message ||
    data?.message ||
    data?.details?.message ||
    'Request failed';
  const singleLine = String(concise).replace(/\s+/g, ' ').trim();
  return `HTTP ${status} - ${singleLine.slice(0, 220)}`;
}

export function resolveAssetUrl(path) {
  if (!path) return '';
  const rawPath = String(path).trim();
  if (!rawPath) return '';
  if (/^(null|undefined|none|nan)$/i.test(rawPath)) return '';
  const buildBackendProxyAssetUrl = (assetPath) => {
    const raw = String(assetPath || '').trim();
    const normalized = (() => {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })();
    if (!normalized) return '';
    return `${API_BASE_URL}/frappe-cure/asset?path=${encodeURIComponent(normalized)}`;
  };
  if (/^\/(files|private\/files)\//i.test(rawPath)) {
    return buildBackendProxyAssetUrl(rawPath);
  }
  if (/^(https?:)?\/\//i.test(rawPath)) {
    // Route Frappe file URLs through backend proxy to avoid host/site and private-file issues.
    if (/\/(?:private\/)?files\//i.test(rawPath)) {
      try {
        const u = new URL(rawPath);
        return buildBackendProxyAssetUrl(`${u.pathname}${u.search}`);
      } catch {
        // Continue with existing normalization.
      }
    }
    let normalized = rawPath.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, API_BASE_URL);
    if (FRAPPE_BASE_URL) {
      normalized = normalized
        .replace(/^https?:\/\/(dev\.local|localhost|127\.0\.0\.1)(:\d+)?\/private\/files\//i, `${FRAPPE_BASE_URL}/files/`)
        .replace(/^https?:\/\/(dev\.local|localhost|127\.0\.0\.1)(:\d+)?\/files\//i, `${FRAPPE_BASE_URL}/files/`);
      // Generic host normalization for local-only Frappe URLs.
      normalized = normalized.replace(/^https?:\/\/(dev\.local|localhost|127\.0\.0\.1)(:\d+)?/i, FRAPPE_BASE_URL);
    }
    return encodeURI(normalized);
  }
  if (/^(data|file):/i.test(rawPath)) return rawPath;
  if (rawPath.startsWith('uploads/')) {
    return encodeURI(`${API_BASE_URL}/${rawPath}`);
  }
  if (!rawPath.startsWith('/') && !rawPath.includes('/')) {
    return encodeURI(`${API_BASE_URL}/uploads/${rawPath}`);
  }
  const prefix = rawPath.startsWith('/') ? '' : '/';
  return encodeURI(`${API_BASE_URL}${prefix}${rawPath}`);
}

function getMethod(options = {}) {
  return String(options.method ?? 'GET').toUpperCase();
}

function isCacheableRequest(path, options = {}) {
  if (getMethod(options) !== 'GET') return false;
  if (!path || !path.startsWith('/')) return false;
  return true;
}

function hashCacheValue(value = '') {
  let hash = 14695981039346656037n;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(36);
}

function getCacheKey(path, token) {
  const authScope = token ? `auth-${hashCacheValue(token)}` : 'public';
  return `${API_CACHE_PREFIX}.${authScope}.${hashCacheValue(path)}`;
}

function runCacheMutation(task) {
  const result = cacheMutation.then(task, task);
  cacheMutation = result.catch(() => {});
  return result;
}

function removeLegacyApiCache() {
  if (Platform.OS === 'web') return Promise.resolve();
  legacyCacheCleanup ??= AsyncStorage.getAllKeys()
    .then(keys => keys.filter(key => key.startsWith(LEGACY_API_CACHE_PREFIX)))
    .then(keys => (keys.length > 0 ? AsyncStorage.multiRemove(keys) : undefined))
    .catch(() => {});
  return legacyCacheCleanup;
}

async function getCacheIndex() {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(API_CACHE_INDEX)) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readCachedResponse(cacheKey) {
  if (!cacheKey) return null;
  try {
    await removeLegacyApiCache();
    const raw = await secureStorage.getItem(cacheKey);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    if (!('timestamp' in payload) || !('data' in payload)) return null;
    if (Date.now() - payload.timestamp > API_CACHE_MAX_AGE_MS) {
      await secureStorage.removeItem(cacheKey);
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

async function writeCachedResponse(cacheKey, data) {
  if (!cacheKey || data == null) return;
  try {
    await removeLegacyApiCache();
    await runCacheMutation(async () => {
      const index = await getCacheIndex();
      if (!index.includes(cacheKey)) {
        await AsyncStorage.setItem(API_CACHE_INDEX, JSON.stringify([...index, cacheKey]));
      }
      await secureStorage.setItem(
        cacheKey,
        JSON.stringify({ timestamp: Date.now(), data }),
      );
    });
  } catch {
    // Ignore cache write failures.
  }
}

export async function clearApiCache() {
  await removeLegacyApiCache();
  await runCacheMutation(async () => {
    const cacheKeys = await getCacheIndex();
    await Promise.all(cacheKeys.map(cacheKey => secureStorage.removeItem(cacheKey)));
    await AsyncStorage.removeItem(API_CACHE_INDEX);
  });
}

export async function request(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const cacheable = isCacheableRequest(path, options);
  const cacheKey = cacheable ? getCacheKey(path, token) : null;

  const doFetch = async (baseUrl = API_URL) => {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(compactApiErrorMessage(data, response.status));
    }

    return data?.data ?? data;
  };

  const fetchAndCache = async (baseUrl = API_URL) => {
    const result = await doFetch(baseUrl);
    if (cacheable && cacheKey) {
      await writeCachedResponse(cacheKey, result);
    }
    return result;
  };

  // Avoid hard offline gating because NetInfo can be inaccurate on LAN/dev setups.

  try {
    return await fetchAndCache(API_URL);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isApiPrefixMismatch =
      /^HTTP 404\b/i.test(message) && /Cannot (GET|POST|PATCH|PUT|DELETE) \/api\//i.test(message);

    // Some deployed backends don't use /api prefix. Retry once without it.
    if (isApiPrefixMismatch && API_BASE_URL !== API_URL) {
      try {
        return await fetchAndCache(API_BASE_URL);
      } catch (prefixRetryError) {
        throw prefixRetryError;
      }
    }

    // Only GETs are retried: re-sending a POST could repeat its side effect (e.g. a slow AI call).
    const shouldRetry =
      getMethod(options) === 'GET' &&
      /pool timeout|fetch failed|network request failed|aborted|network timeout/i.test(message);

    if (!shouldRetry) {
      if (cacheable && cacheKey) {
        const cached = await readCachedResponse(cacheKey);
        if (cached != null) return cached;
      }
      if (/^http\s+/i.test(message)) throw error;
      throw new Error(`تعذر الاتصال بالخادم (${API_URL}${path}) : ${message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 700));

    try {
      return await fetchAndCache(API_URL);
    } catch (retryError) {
      const retryMessage = retryError instanceof Error ? retryError.message : 'Unknown network error';
      if (cacheable && cacheKey) {
        const cached = await readCachedResponse(cacheKey);
        if (cached != null) return cached;
      }
      if (/^http\s+/i.test(retryMessage)) throw retryError;
      if (/aborted|network timeout/i.test(retryMessage)) {
        throw new Error(`انتهت مهلة الاتصال بالخادم (${API_URL}${path}).`);
      }
      throw new Error(`تعذر الاتصال بالخادم (${API_URL}${path}) : ${retryMessage}`);
    }
  }
}

export { API_URL, API_BASE_URL };
