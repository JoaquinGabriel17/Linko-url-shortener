import axios from 'axios';
import { clearSession, getToken } from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Adjunta el token (si hay) a cada request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Maneja el 401 global: solo redirige a login si el request llevó token y no es
// un endpoint de /auth (login/register fallan por credenciales, no por sesión).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const sentToken = Boolean(error.config?.headers?.Authorization);

    if (status === 401 && sentToken && !requestUrl.includes('/auth/')) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    if (status === 429) {
      error.message =
        error.response?.data?.error ||
        'Demasiadas solicitudes. Intentá de nuevo en unos minutos.';
    }

    return Promise.reject(error);
  }
);

export default api;
