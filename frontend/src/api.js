import axios from 'axios';
import { clearSession, getToken } from './session';

// Evento global que dispara el interceptor cuando una request autenticada
// recibe 401 (token ausente/expirado). UserProvider lo escucha y cierra sesión
// dentro del SPA, sin recargar la página.
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// Único cliente HTTP de la app. La base sale de VITE_API_URL (sin hardcodes) y
// el timeout cubre los arranques en frío del backend.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

// Adjunta el token (si hay) a cada request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 en login/register es una credencial inválida (error propio de esos
// formularios), no una sesión expirada. El resto de 401 con token sí lo es.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const sentToken = Boolean(error.config?.headers?.Authorization);
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => requestUrl.includes(path));

    if (status === 401 && sentToken && !isAuthEndpoint) {
      clearSession();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  }
);

// Mensaje legible a partir de un error, sin importar la forma que devuelva el
// backend: JSON `{ message }`, JSON `{ error }`, texto plano, o fallo de red.
export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado') {
  if (error?.isAxiosError && !error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'El servidor tardó demasiado en responder. Intentá de nuevo.';
    }
    return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
  }

  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }
  return data?.message || data?.error || error?.message || fallback;
}

export default api;
