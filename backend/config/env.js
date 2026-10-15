import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const requiredString = (name) =>
  z
    .string({ error: `${name} es obligatoria` })
    .min(1, `${name} es obligatoria`);

const schema = z.object({
  MONGO_URI: requiredString('MONGO_URI'),
  JWT_SECRET: requiredString('JWT_SECRET'),
  PORT: z.coerce.number().int().positive().default(10000),
  BASE_URL: requiredString('BASE_URL')
    .url('BASE_URL debe ser una URL válida (ej: http://localhost:10000)')
    .transform((value) => value.replace(/\/+$/, '')),
  ALLOWED_ORIGINS: requiredString('ALLOWED_ORIGINS')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .refine((origins) => origins.length >= 1, {
      message: 'ALLOWED_ORIGINS debe contener al menos un origen válido',
    }),
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
