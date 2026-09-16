const API_BASE = '/api';

export const api = {
  getToken: () => localStorage.getItem('saas_token'),
  setToken: (token: string) => localStorage.setItem('saas_token', token),
  clearToken: () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
  },
  getUser: () => {
    const raw = localStorage.getItem('saas_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: any) => localStorage.setItem('saas_user', JSON.stringify(user)),

  async request(endpoint: string, options: RequestInit = {}) {
    const token = api.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        api.clearToken();
      }
      const err: any = new Error(data.message || data.errors?.[0]?.message || 'Error en la petición');
      err.code = data.code;
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  // Auth
  login: (credentials: { nationalId: string; password: string }) =>
    api.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: any) =>
    api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  // Tasa de Cambio Oficial BCV en Tiempo Real
  getExchangeRate: () => api.request('/exchange/rate'),

  // Super Admin (Exclusivo para administrar usuarios, licencias, suscripciones y auditoría)
  getWorkers: (status?: string) =>
    api.request(`/admin/workers${status ? `?status=${status}` : ''}`),
  createWorker: (payload: any) =>
    api.request('/admin/workers', { method: 'POST', body: JSON.stringify(payload) }),
  updateWorkerStatus: (workerId: string, payload: { status: string }) =>
    api.request(`/admin/workers/${workerId}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
  manageWorkerLicense: (workerId: string, payload: { unit: string; amount?: number; customEndDate?: string; status?: string }) =>
    api.request(`/admin/workers/${workerId}/license`, { method: 'POST', body: JSON.stringify(payload) }),
  revokeWorkerLicense: (workerId: string) =>
    api.request(`/admin/workers/${workerId}/license/revoke`, { method: 'POST' }),
  deleteWorker: (workerId: string) =>
    api.request(`/admin/workers/${workerId}`, { method: 'DELETE' }),
  getAuditLogs: () => api.request('/admin/audit-logs'),
  getMetrics: () => api.request('/admin/metrics'),
  getPlans: () => api.request('/subscriptions/plans'),

  // Worker (Espacio de Trabajo Autónomo: Clientas, Servicios, Citas)
  getWorkerDashboard: () => api.request('/worker/dashboard'),
  getClients: () => api.request('/worker/clients'),
  createClient: (payload: any) =>
    api.request('/worker/clients', { method: 'POST', body: JSON.stringify(payload) }),
  updateClient: (clientId: string, payload: any) =>
    api.request(`/worker/clients/${clientId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteClient: (clientId: string) =>
    api.request(`/worker/clients/${clientId}`, { method: 'DELETE' }),
  getServices: () => api.request('/worker/services'),
  createService: (payload: any) =>
    api.request('/worker/services', { method: 'POST', body: JSON.stringify(payload) }),
  updateService: (serviceId: string, payload: any) =>
    api.request(`/worker/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteService: (serviceId: string) =>
    api.request(`/worker/services/${serviceId}`, { method: 'DELETE' }),
  getAppointments: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/worker/appointments${query ? `?${query}` : ''}`);
  },
  createAppointment: (payload: any) =>
    api.request('/worker/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  updateAppointmentStatus: (appointmentId: string, status: string) =>
    api.request(`/worker/appointments/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ estado: status }) }),
};
