import { request } from './api';
import { getToken } from './auth';

export async function getLinkedHospitals() {
  const token = await getToken();
  return request('/hospitals', { method: 'GET' }, token);
}

export async function getHospitalById(id) {
  const token = await getToken();
  return request(`/hospitals/${id}`, { method: 'GET' }, token);
}
