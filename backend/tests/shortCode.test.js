import { describe, expect, it, vi } from 'vitest';

import { env } from '../config/env.js';
import {
  ShortCodeCollisionError,
  createWithUniqueCode,
  generateCode,
} from '../services/shortCode.js';
import { RESERVED_ALIASES } from '../services/alias.js';

const BASE62 = /^[0-9A-Za-z]+$/;

function duplicateKeyError(keyPattern) {
  const error = new Error('E11000 duplicate key');
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
}

describe('generateCode', () => {
  it('usa la longitud por defecto de env', () => {
    expect(generateCode()).toHaveLength(env.SHORT_CODE_LENGTH);
  });

  it('respeta una longitud personalizada', () => {
    expect(generateCode(12)).toHaveLength(12);
  });

  it('solo usa caracteres base62', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateCode(10)).toMatch(BASE62);
    }
  });

  it('no repite códigos en un muestreo', () => {
    const codes = new Set();
    for (let i = 0; i < 2000; i++) {
      codes.add(generateCode(8));
    }
    expect(codes.size).toBe(2000);
  });

  it('descarta y regenera códigos reservados (case-insensitive)', () => {
    const sequence = ['api', 'LiNkS', 'ok1'];
    let i = 0;
    const rawGenerator = () => sequence[i++];

    expect(generateCode(3, rawGenerator)).toBe('ok1');
    expect(i).toBe(3);
  });
});

describe('createWithUniqueCode', () => {
  it('reintenta ante colisión del índice shortCode (E11000)', async () => {
    let saves = 0;
    const FakeLink = class {
      constructor(data) {
        Object.assign(this, data);
      }

      async save() {
        saves++;
        if (this.shortCode === 'DUP001') {
          throw duplicateKeyError({ shortCode: 1 });
        }
        return this;
      }
    };

    const generate = vi.fn().mockReturnValueOnce('DUP001').mockReturnValueOnce('OK0001');

    const link = await createWithUniqueCode({
      Link: FakeLink,
      data: { originalUrl: 'https://example.com/x' },
      generate,
      attempts: 5,
      length: 6,
    });

    expect(link.shortCode).toBe('OK0001');
    expect(generate).toHaveBeenCalledTimes(2);
    expect(saves).toBe(2);
  });

  it('lanza ShortCodeCollisionError al agotar los intentos', async () => {
    const FakeLink = class {
      constructor(data) {
        Object.assign(this, data);
      }

      async save() {
        throw duplicateKeyError({ shortCode: 1 });
      }
    };

    const generate = vi.fn(() => 'DUP001');

    await expect(
      createWithUniqueCode({
        Link: FakeLink,
        data: { originalUrl: 'https://example.com/x' },
        generate,
        attempts: 3,
      })
    ).rejects.toBeInstanceOf(ShortCodeCollisionError);

    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('propaga una colisión de otro índice sin reintentar', async () => {
    const FakeLink = class {
      constructor(data) {
        Object.assign(this, data);
      }

      async save() {
        throw duplicateKeyError({ createdBy: 1 });
      }
    };

    const generate = vi.fn(() => 'OK0001');

    await expect(
      createWithUniqueCode({
        Link: FakeLink,
        data: { originalUrl: 'https://example.com/x' },
        generate,
        attempts: 3,
      })
    ).rejects.toThrow('E11000 duplicate key');

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('propaga errores que no son de clave duplicada', async () => {
    const boom = new Error('boom');
    const FakeLink = class {
      constructor(data) {
        Object.assign(this, data);
      }

      async save() {
        throw boom;
      }
    };

    await expect(
      createWithUniqueCode({
        Link: FakeLink,
        data: { originalUrl: 'https://example.com/x' },
        generate: () => 'OK0001',
        attempts: 3,
      })
    ).rejects.toBe(boom);
  });
});

describe('RESERVED_ALIASES', () => {
  it('no contiene entradas con punto (el charset no las admite)', () => {
    for (const alias of RESERVED_ALIASES) {
      expect(alias).not.toContain('.');
    }
  });
});
