import { request } from './api';
import { getToken } from './auth';

export async function getReports(filters = {}) {
  const token = await getToken();
  const params = new URLSearchParams();

  if (filters.type) params.set('type', filters.type);
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const path = query ? `/reports?${query}` : '/reports';
  return request(path, { method: 'GET' }, token);
}

export async function getRecentReports(limit = 5) {
  const token = await getToken();
  return request(`/reports/recent?limit=${limit}`, { method: 'GET' }, token);
}

export async function getReportById(id) {
  if (!id) {
    throw new Error('معرّف التقرير غير صالح');
  }
  const token = await getToken();
  return request(`/reports/${id}`, { method: 'GET', timeoutMs: 90000 }, token);
}

// Only one of the report's suggested questions can be asked (not a free chat).
export async function askReportQuestion(id, question) {
  const token = await getToken();
  return request(`/reports/${id}/ask`, { method: 'POST', body: { question }, timeoutMs: 90000 }, token);
}
