import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const requiredString = (name, minLength = 1) =>
  z
    .string({ error: `${name} es obligatoria` })
    .min(
      minLength,
      minLength === 1
        ? `${name} es obligatoria`
        : `${name} debe tener al menos ${minLength} caracteres`
    );

const schema = z.object({
  MONGO_URI: requiredString('MONGO_URI'),
  JWT_SECRET: requiredString('JWT_SECRET', 32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(
      /^\d+(ms|s|m|h|d|w|y)$/,
      'JWT_EXPIRES_IN debe ser una duración como 1d, 12h, 30m'
    )
    .default('1d'),
  PORT: z.coerce.number().int().positive().default(10000),
  BASE_URL: requiredString('BASE_URL')
    .url('BASE_URL debe ser una URL válida (ej: http://localhost:10000)')
    .transform((value) => value.replace(/\/+$/, '')),
  ALLOWED_ORIGINS: requiredString('ALLOWED_ORIGINS')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .refine((origins) => origins.length >= 1, {
      message: 'ALLOWED_ORIGINS debe contener al menos un origen válido',
    }),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_CREATE_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_REDIRECT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_REDIRECT_MAX: z.coerce.number().int().positive().default(120),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('\n');

  console.error(`\n[config] Variables de entorno inválidas o faltantes:\n${details}\n`);
  console.error('Revisá backend/.env y comparalo con backend/.env.example.\n');
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
