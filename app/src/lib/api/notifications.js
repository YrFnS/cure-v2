import { request } from './api';
import { getToken } from './auth';

export async function getNotifications(filters = {}) {
  const token = await getToken();
  const params = new URLSearchParams();

  if (filters.read !== undefined) params.set('read', String(filters.read));
  if (filters.type) params.set('type', filters.type);
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const path = query ? `/notifications?${query}` : '/notifications';
  return request(path, { method: 'GET' }, token);
}

export async function getRecentNotifications(limit = 5) {
  const token = await getToken();
  return request(`/notifications/recent?limit=${limit}`, { method: 'GET' }, token);
}

export async function getUnreadCount() {
  const token = await getToken();
  return request('/notifications/unread-count', { method: 'GET' }, token);
}

export async function markNotificationRead(id) {
  const token = await getToken();
  return request(`/notifications/${id}/read`, { method: 'PATCH' }, token);
}

export async function markAllNotificationsRead() {
  const token = await getToken();
  return request('/notifications/read-all', { method: 'PATCH' }, token);
}

export async function deleteNotification(id) {
  const token = await getToken();
  return request(`/notifications/${id}`, { method: 'DELETE' }, token);
}

export async function registerPushToken(payload) {
  const token = await getToken();
  return request('/notifications/push-token', {
    method: 'POST',
    body: payload,
  }, token);
}

export async function deletePushToken(payload) {
  const token = await getToken();
  return request('/notifications/push-token', {
    method: 'DELETE',
    body: payload,
  }, token);
}
