import axios from 'axios';
import { getAppConfig } from '../config';
import { useAuthStore } from '../stores/authStore';

const config = getAppConfig();

export const httpClient = axios.create({
  baseURL: config.api_url,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adjuntar JWT desde la memoria del store Zustand (Req. 12.7)
httpClient.interceptors.request.use((reqConfig) => {
  const token = useAuthStore.getState().token;
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Interceptor para detectar 401 -> redirigir a login descartando token de memoria (Req. 1.4)
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
