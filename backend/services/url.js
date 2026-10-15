import { z } from 'zod';
import { env } from '../config/env.js';

export const MAX_URL_LENGTH = 2048;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function hostnameOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Hostnames propios: el backend (BASE_URL) y los orígenes del frontend
// (ALLOWED_ORIGINS). Acortar cualquiera de ellos crearía un bucle de
// redirección, por eso se rechazan.
const SELF_HOSTNAMES = new Set(
  [env.BASE_URL, ...env.ALLOWED_ORIGINS].map(hostnameOf).filter(Boolean)
);

// Devuelve { valid: true, normalized } o { valid: false, error }.
export function validateUrl(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'La URL debe ser un texto' };
  }

  const value = raw.trim();

  if (!value) {
    return { valid: false, error: 'La URL es obligatoria' };
  }
  if (value.length > MAX_URL_LENGTH) {
    return { valid: false, error: `La URL no puede superar los ${MAX_URL_LENGTH} caracteres` };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return { valid: false, error: 'La URL no es válida' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { valid: false, error: 'Solo se permiten URLs http o https' };
  }
  if (url.username || url.password) {
    return { valid: false, error: 'La URL no puede contener credenciales embebidas' };
  }
  if (SELF_HOSTNAMES.has(url.hostname.toLowerCase())) {
    return { valid: false, error: 'No se puede acortar una URL de este servicio' };
  }

  // La forma normalizada también debe respetar el máximo.
  const normalized = url.href;
  if (normalized.length > MAX_URL_LENGTH) {
    return { valid: false, error: `La URL no puede superar los ${MAX_URL_LENGTH} caracteres` };
  }

  return { valid: true, normalized };
}

// Forma normalizada para comparar/deduplicar, o null si es inválida.
export function normalizeUrl(raw) {
  const result = validateUrl(raw);
  return result.valid ? result.normalized : null;
}

export const httpUrlSchema = z
  .string({ error: 'La URL es obligatoria' })
  .trim()
  .superRefine((value, ctx) => {
    const result = validateUrl(value);
    if (!result.valid) {
      ctx.addIssue({ code: 'custom', message: result.error });
    }
  });
