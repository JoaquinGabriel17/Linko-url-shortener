import { defineConfig } from 'vitest/config';

// Mismo sistema de módulos que el backend ("type": "module" -> ESM).
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});
