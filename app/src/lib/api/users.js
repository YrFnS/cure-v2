import { request } from './api';
import { getToken } from './auth';

export async function updateProfile(payload) {
  const token = await getToken();
  return request('/users/me', { method: 'PATCH', body: payload }, token);
}
