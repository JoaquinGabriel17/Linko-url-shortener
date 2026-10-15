import { describe, expect, it } from 'vitest';

import { env } from '../config/env.js';
import { MAX_URL_LENGTH, normalizeUrl, validateUrl } from '../services/url.js';

describe('validateUrl', () => {
  it('acepta http y https', () => {
    expect(validateUrl('http://example.com').valid).toBe(true);
    expect(validateUrl('https://example.com/path?q=1').valid).toBe(true);
  });

  it('devuelve la forma normalizada', () => {
    expect(validateUrl('https://example.com/a').normalized).toBe('https://example.com/a');
  });

  it('rechaza protocolos no http/https', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,<h1>x</h1>',
      'file:///etc/passwd',
      'ftp://example.com/file',
    ]) {
      const result = validateUrl(url);
      expect(result.valid).toBe(false);
    }
  });

  it('rechaza URLs que superan 2048 caracteres', () => {
    const long = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;
    expect(validateUrl(long).valid).toBe(false);
  });

  it('rechaza cuando la forma normalizada supera 2048 aunque la cruda no', () => {
    // 'é' ocupa 1 char crudo pero se percent-encodea a '%C3%A9' (6 chars).
    const raw = `https://example.com/${'é'.repeat(400)}`;
    expect(raw.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(validateUrl(raw).valid).toBe(false);
  });

  it('rechaza credenciales embebidas', () => {
    expect(validateUrl('https://user:pass@example.com').valid).toBe(false);
    expect(validateUrl('https://soloUser@example.com').valid).toBe(false);
  });

  it('rechaza auto-referencia al hostname de BASE_URL', () => {
    const host = new URL(env.BASE_URL).hostname;
    expect(validateUrl(`http://${host}/algo`).valid).toBe(false);
  });

  it('rechaza auto-referencia a los orígenes del frontend', () => {
    const host = new URL(env.ALLOWED_ORIGINS[0]).hostname;
    expect(validateUrl(`http://${host}/algo`).valid).toBe(false);
    const secondHost = new URL(env.ALLOWED_ORIGINS[1]).hostname;
    expect(validateUrl(`https://${secondHost}/algo`).valid).toBe(false);
  });

  it('rechaza entradas no válidas', () => {
    expect(validateUrl('no-es-una-url').valid).toBe(false);
    expect(validateUrl('').valid).toBe(false);
    expect(validateUrl('   ').valid).toBe(false);
    expect(validateUrl(123).valid).toBe(false);
    expect(validateUrl(null).valid).toBe(false);
    expect(validateUrl(undefined).valid).toBe(false);
  });

  it('normaliza para comparar (host, puerto por defecto, mayúsculas)', () => {
    expect(normalizeUrl('HTTP://Example.com:80/a')).toBe(normalizeUrl('http://example.com/a'));
    expect(normalizeUrl('https://EXAMPLE.com/')).toBe('https://example.com/');
  });

  it('normalizeUrl devuelve null para entradas inválidas', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('no-es-url')).toBeNull();
  });
});
