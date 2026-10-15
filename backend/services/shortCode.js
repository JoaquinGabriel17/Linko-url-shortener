import { customAlphabet } from 'nanoid';
import { env } from '../config/env.js';
import { RESERVED_ALIASES } from './alias.js';

// Base62: 0-9, A-Z, a-z. Los códigos son case-sensitive.
export const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const generators = new Map();

function generatorFor(length) {
  if (!generators.has(length)) {
    generators.set(length, customAlphabet(ALPHABET, length));
  }
  return generators.get(length);
}

export class ShortCodeCollisionError extends Error {
  constructor(message = 'No se pudo generar un código único') {
    super(message);
    this.name = 'ShortCodeCollisionError';
  }
}

// Genera un código base62 de longitud configurable, descartando cualquier
// resultado reservado (comparación case-insensitive). Nunca usa Math.random().
// `rawGenerator` existe para poder inyectar una secuencia en los tests.
export function generateCode(length = env.SHORT_CODE_LENGTH, rawGenerator) {
  const generator = rawGenerator ?? generatorFor(length);
  let code;
  do {
    code = generator();
  } while (RESERVED_ALIASES.has(code.toLowerCase()));
  return code;
}

// Crea un Link reintentando ante colisión del índice único de shortCode.
// - Ante E11000 sobre shortCode: reintenta con un código nuevo.
// - Ante E11000 sobre otro índice, o cualquier otro error: propaga.
// - Al agotar los intentos: ShortCodeCollisionError (la ruta responde 503).
export async function createWithUniqueCode({
  Link,
  data,
  generate = generateCode,
  attempts = env.SHORT_CODE_MAX_RETRIES,
  length = env.SHORT_CODE_LENGTH,
}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const link = new Link({ ...data, shortCode: generate(length) });
      await link.save();
      return link;
    } catch (error) {
      const isShortCodeCollision =
        error?.code === 11000 && error?.keyPattern?.shortCode !== undefined;
      if (isShortCodeCollision) {
        continue;
      }
      throw error;
    }
  }

  throw new ShortCodeCollisionError();
}
