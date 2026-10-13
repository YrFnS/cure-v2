import { request } from './api';
import { getToken } from './auth';

// front/back are data URLs (data:image/jpeg;base64,...). Returns { status: 'verified', patient }, or
// { status: 'pending' } when the card takes longer than a few seconds to read — then poll getIdCheck.
export async function verifyNationalId(front, back) {
  const token = await getToken();
  return request('/verification/id', { method: 'POST', body: { front, back }, timeoutMs: 90000 }, token);
}

// { status: 'none' | 'pending' | 'verified' | 'failed', patient?, message? }
export async function getIdCheck() {
  const token = await getToken();
  return request('/verification/id', {}, token);
}

// Single-use upload link (QR/share) for the lab; valid 24 hours, one result.
export async function createLabToken() {
  const token = await getToken();
  return request('/lab-token', { method: 'POST' }, token);
}
