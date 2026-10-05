import { request } from './api';
import { getToken } from './auth';

export async function getLinkedDoctors(filters = {}) {
  const token = await getToken();
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.specialty) params.set('specialty', filters.specialty);
  if (filters.insurance) params.set('insurance', filters.insurance);

  const query = params.toString();
  const path = query ? `/doctors?${query}` : '/doctors';
  return request(path, { method: 'GET' }, token);
}

export async function getDoctorById(id) {
  const token = await getToken();
  return request(`/doctors/${id}`, { method: 'GET' }, token);
}
