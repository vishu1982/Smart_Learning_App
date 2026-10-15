import axios from 'axios';

let rawUrl = (import.meta.env.VITE_API_URL || '/api/v1').trim();

// Auto-append /api/v1 if an external domain URL is configured without it
if (rawUrl.startsWith('http')) {
  const clean = rawUrl.replace(/\/+$/, '');
  if (!clean.endsWith('/api/v1')) {
    rawUrl = `${clean}/api/v1`;
  }
}

const API_BASE_URL = rawUrl;

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
    }
    return Promise.reject(error);
  }
);
