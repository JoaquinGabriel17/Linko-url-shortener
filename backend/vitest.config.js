import { defineConfig } from 'vitest/config';

// Mismo sistema de módulos que el backend ("type": "module" -> ESM).
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    // holgado para la primera descarga del binario de mongodb-memory-server
    // (~600 MB) en un runner de CI en frío, que puede acercarse a los 60s.
    hookTimeout: 120000,
    testTimeout: 120000,
  },
});
