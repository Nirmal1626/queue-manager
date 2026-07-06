const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getQueues: () => request('/queues'),
  createQueue: (name) => request('/queues', { method: 'POST', body: JSON.stringify({ name }) }),
  getQueue: (id) => request(`/queues/${id}`),
  deleteQueue: (id) => request(`/queues/${id}`, { method: 'DELETE' }),

  addToken: (queueId, person_name) =>
    request(`/queues/${queueId}/tokens`, { method: 'POST', body: JSON.stringify({ person_name }) }),
  moveUp: (queueId, tokenId) =>
    request(`/queues/${queueId}/tokens/${tokenId}/move-up`, { method: 'POST' }),
  moveDown: (queueId, tokenId) =>
    request(`/queues/${queueId}/tokens/${tokenId}/move-down`, { method: 'POST' }),
  serveNext: (queueId) => request(`/queues/${queueId}/serve-next`, { method: 'POST' }),
  cancelToken: (queueId, tokenId) =>
    request(`/queues/${queueId}/tokens/${tokenId}/cancel`, { method: 'POST' }),

  getAnalytics: () => request('/analytics'),
};