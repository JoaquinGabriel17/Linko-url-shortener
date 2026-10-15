import { describe, expect, it } from 'vitest';

import {
  MAX_ALIAS_LENGTH,
  MIN_ALIAS_LENGTH,
  RESERVED_ALIASES,
  validateAlias,
} from '../services/alias.js';

describe('validateAlias', () => {
  it('acepta los límites de longitud (3 y 30)', () => {
    expect(validateAlias('a'.repeat(MIN_ALIAS_LENGTH)).valid).toBe(true);
    expect(validateAlias('a'.repeat(MAX_ALIAS_LENGTH)).valid).toBe(true);
  });

  it('rechaza longitudes fuera de rango (2 y 31)', () => {
    expect(validateAlias('a'.repeat(MIN_ALIAS_LENGTH - 1)).valid).toBe(false);
    expect(validateAlias('a'.repeat(MAX_ALIAS_LENGTH + 1)).valid).toBe(false);
  });

  it('acepta el charset permitido', () => {
    expect(validateAlias('abc_DEF-123').valid).toBe(true);
  });

  it('rechaza caracteres fuera del charset', () => {
    for (const alias of ['a.b', 'a/b', 'a b', 'a@b', 'a+b', 'a%b', 'ábc']) {
      expect(validateAlias(alias).valid).toBe(false);
    }
  });

  it('rechaza palabras reservadas sin importar el casing', () => {
    for (const alias of ['API', 'Login', 'register', 'LINKS', 'Auth', 'SHORTEN', 'admin', 'User']) {
      expect(RESERVED_ALIASES.has(alias.toLowerCase())).toBe(true);
      expect(validateAlias(alias).valid).toBe(false);
    }
  });

  it('acepta alias válidos no reservados (sensible a mayúsculas)', () => {
    expect(validateAlias('linkos').valid).toBe(true);
    expect(validateAlias('Mi_Alias-1').valid).toBe(true);
  });

  it('rechaza valores que no son string', () => {
    expect(validateAlias(123).valid).toBe(false);
    expect(validateAlias(null).valid).toBe(false);
    expect(validateAlias(undefined).valid).toBe(false);
  });

  it('normaliza con trim', () => {
    const result = validateAlias('  miAlias  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('miAlias');
  });
});
