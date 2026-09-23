import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
};

export const resumeAPI = {
  upload: (formData) => api.post('/api/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getLatest: () => api.get('/api/resume/latest'),
  updateProfile: (resumeId, data) => api.put(`/api/resume/update/${resumeId}`, data),
  getReportJSON: () => api.get('/api/resume/report/json'),
  getReportPDFUrl: () => {
    const token = localStorage.getItem('token') || '';
    return `${API_BASE_URL}/api/resume/report/pdf?token=${encodeURIComponent(token)}`;
  },
  downloadReportPDF: async () => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.get(`${API_BASE_URL}/api/resume/report/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Consolidated_AI_Resume_Report.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  clearAllData: () => api.delete('/api/resume/clear')
};

export const jobsAPI = {
  search: ({ keywords, targetRole, location, workMode, experienceLevel, sortBy }) => 
    api.post('/api/jobs/search', { 
      keywords, 
      target_role: targetRole, 
      location,
      work_mode: workMode || "All",
      experience_level: experienceLevel || "All",
      sort_by: sortBy || "match_score"
    }),
  list: () => api.get('/api/jobs/list'),
  updateAction: (jobIds, status) => api.post('/api/jobs/action', { job_ids: jobIds, status }),
};

export const actionsAPI = {
  autoApply: (jobIds, jobs = []) => api.post('/api/actions/auto-apply', { job_ids: jobIds, jobs: jobs }),
};

export default api;
