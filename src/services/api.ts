import axios, { type InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS } from '../utils/constants';

const API_BASE_URL: string =
  import.meta.env?.VITE_API_URL || 'https://integrador-backend-fuom.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (raw) {
      const session = JSON.parse(raw);
      const token = session?.token || session?.accessToken;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    /* ignorar errores al parsear la sesión */
  }
  return config;
});

export { API_BASE_URL };
export default api;
