const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getToken() {
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    throw new ApiError(res.status, detail || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    mobile?: string;
    role: string;
    organization_name?: string;
  }) =>
    request<{ access_token: string; refresh_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  oauthGoogle: (data: { code: string; redirect_uri: string; role?: string; organization_name?: string }) =>
    request<{ access_token: string; refresh_token: string }>('/auth/oauth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  oauthLinkedIn: (data: { code: string; redirect_uri: string; role?: string; organization_name?: string }) =>
    request<{ access_token: string; refresh_token: string }>('/auth/oauth/linkedin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  oauthAuthorizeUrl: (provider: string, redirectUri: string) =>
    request<{ authorize_url: string }>(`/auth/oauth/${provider}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&state=jobs`),
  me: () => request<import('@/types').User>('/auth/me'),
  jobs: {
    list: (params?: {
      keyword?: string;
      location?: string;
      employment_type?: string;
      skill?: string;
      min_experience?: number;
      max_experience?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.keyword) q.set('keyword', params.keyword);
      if (params?.location) q.set('location', params.location);
      if (params?.employment_type) q.set('employment_type', params.employment_type);
      if (params?.skill) q.set('skill', params.skill);
      if (params?.min_experience != null) q.set('min_experience', String(params.min_experience));
      if (params?.max_experience != null) q.set('max_experience', String(params.max_experience));
      const qs = q.toString();
      return request<import('@/types').JobListItem[]>(`/jobs${qs ? `?${qs}` : ''}`);
    },
    locations: (q?: string) => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      return request<string[]>(`/jobs/locations${qs}`);
    },
    filters: () => request<import('@/types').JobFilterMeta>('/jobs/filters'),
    get: (id: string) => request<import('@/types').Job>(`/jobs/${id}`),
    mine: () => request<import('@/types').Job[]>('/jobs/mine/list'),
    create: (data: Record<string, unknown>) =>
      request<import('@/types').Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<import('@/types').Job>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<import('@/types').Job>(`/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    apply: (id: string, formData: FormData) =>
      request<import('@/types').Application>(`/jobs/${id}/apply`, { method: 'POST', body: formData }),
    bulkUpload: (id: string, formData: FormData) =>
      request<import('@/types').BulkUploadBatch>(`/jobs/${id}/bulk-upload`, { method: 'POST', body: formData }),
    applications: (id: string) => request<import('@/types').Application[]>(`/jobs/${id}/applications`),
  },
  profile: {
    get: () => request<import('@/types').CandidateProfile>('/profile'),
    update: (data: Record<string, unknown>) =>
      request<import('@/types').CandidateProfile>('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    uploadResume: (formData: FormData) =>
      request<{ id: string; file_name: string }>('/profile/resume', { method: 'POST', body: formData }),
  },
  applications: {
    mine: () => request<import('@/types').Application[]>('/applications/mine'),
    updateStatus: (id: string, status: string) =>
      request<import('@/types').Application>(`/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    downloadUrl: (id: string) => `${API_BASE}/applications/${id}/resume/download`,
  },
  bulkUploads: {
    mine: () => request<import('@/types').BulkUploadBatch[]>('/bulk-uploads/mine'),
    get: (id: string) => request<import('@/types').BulkUploadBatch>(`/bulk-uploads/${id}`),
  },
  dashboard: {
    recruiter: () => request<import('@/types').RecruiterDashboard>('/dashboard/recruiter'),
    seeker: () => request<import('@/types').SeekerDashboard>('/dashboard/seeker'),
    agency: () => request<import('@/types').AgencyDashboard>('/dashboard/agency'),
  },
};
