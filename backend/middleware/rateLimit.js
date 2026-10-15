import { rateLimit, MemoryStore } from 'express-rate-limit';
import { env } from '../config/env.js';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
};

// Stores expuestos para poder resetearlos entre tests.
export const rateLimitStores = {
  login: new MemoryStore(),
  register: new MemoryStore(),
  create: new MemoryStore(),
  redirect: new MemoryStore(),
};

const authOptions = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_AUTH_MAX,
};

// Login: los intentos exitosos no cuentan (solo cuenta el brute-force).
export const loginLimiter = rateLimit({
  ...base,
  ...authOptions,
  skipSuccessfulRequests: true,
  store: rateLimitStores.login,
});

export const registerLimiter = rateLimit({
  ...base,
  ...authOptions,
  store: rateLimitStores.register,
});

export const createLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_CREATE_MAX,
  store: rateLimitStores.create,
});

// Ventana propia y más laxa para la redirección.
export const redirectLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_REDIRECT_WINDOW_MS,
  limit: env.RATE_LIMIT_REDIRECT_MAX,
  store: rateLimitStores.redirect,
});
