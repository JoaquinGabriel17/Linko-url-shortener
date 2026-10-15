import { z } from 'zod';

// Charset permitido para alias/shortCode creados por el usuario.
export const ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;
export const MIN_ALIAS_LENGTH = 3;
export const MAX_ALIAS_LENGTH = 30;

// Palabras reservadas (case-insensitive). Se construye a partir de:
//   - rutas reales montadas en el backend (app.js): /links, /auth
//   - rutas reales del frontend (main.jsx): /login, /register, /user
//   - lista mínima fija: api, admin, shorten
//   - rutas de infraestructura: assets, static, health
// Los alias generados no deben colisionar con ninguna de estas.
export const RESERVED_ALIASES = new Set([
  'api',
  'admin',
  'shorten',
  'links',
  'auth',
  'login',
  'register',
  'user',
  'assets',
  'static',
  'health',
]);

// Devuelve { valid: true, normalized } o { valid: false, error }.
export function validateAlias(value) {
  if (typeof value !== 'string') {
    return { valid: false, error: 'El alias debe ser un texto' };
  }

  const alias = value.trim();

  if (alias.length < MIN_ALIAS_LENGTH) {
    return { valid: false, error: `El alias debe tener al menos ${MIN_ALIAS_LENGTH} caracteres` };
  }
  if (alias.length > MAX_ALIAS_LENGTH) {
    return { valid: false, error: `El alias debe tener como máximo ${MAX_ALIAS_LENGTH} caracteres` };
  }
  if (!ALIAS_REGEX.test(alias)) {
    return {
      valid: false,
      error: 'El alias solo puede contener letras, números, guiones y guiones bajos',
    };
  }
  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
    return { valid: false, error: 'El alias está reservado' };
  }

  return { valid: true, normalized: alias };
}

export const aliasSchema = z
  .string({ error: 'El alias debe ser un texto' })
  .trim()
  .superRefine((value, ctx) => {
    const result = validateAlias(value);
    if (!result.valid) {
      ctx.addIssue({ code: 'custom', message: result.error });
    }
  });
