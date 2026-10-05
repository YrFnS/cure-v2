import { request } from './api';
import { getToken } from './auth';

// front/back are data URLs (data:image/jpeg;base64,...). Returns the updated, verified patient.
export async function verifyNationalId(front, back) {
  const token = await getToken();
  return request('/verification/id', { method: 'POST', body: { front, back }, timeoutMs: 90000 }, token);
}

// Single-use code the lab tech enters/scans; valid 10 minutes.
export async function createLabToken() {
  const token = await getToken();
  return request('/lab-token', { method: 'POST' }, token);
}
