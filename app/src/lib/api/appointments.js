import { request } from './api';
import { getToken } from './auth';

export async function getDoctorAvailability(doctorId, date) {
  return request(`/doctors/${encodeURIComponent(doctorId)}/availability?date=${encodeURIComponent(date)}`, { method: 'GET' }, await getToken());
}

export async function bookAppointment({ doctorId, slotId, date }) {
  return request('/appointments', { method: 'POST', body: { doctorId, slotId, date } }, await getToken());
}

export async function getAppointments() {
  return request('/appointments', { method: 'GET' }, await getToken());
}

export async function cancelAppointment(id) {
  return request(`/appointments/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' }, await getToken());
}
