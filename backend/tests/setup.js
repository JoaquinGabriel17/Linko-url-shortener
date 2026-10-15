// Estas variables se setean ANTES de importar app.js (y por lo tanto
// config/env.js) para que la validación de zod pase en los tests.
// dotenv.config() no sobreescribe variables ya presentes en process.env.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/linko-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-para-vitest-0123456789abcdef';
process.env.PORT = process.env.PORT || '10000';
// Vitest corre sobre Vite y Vite setea process.env.BASE_URL = "/" (su propio
// `base`). Por eso acá se sobreescribe sin condicionar, para que config/env.js
// vea una URL válida. En producción (node server.js) Vite no interviene.
process.env.BASE_URL = 'http://localhost:10000';
// Segundo origen para poder testear la auto-referencia contra los orígenes del
// frontend, no solo contra BASE_URL.
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,https://frontend.example.com';

// Límites bajos para poder disparar el 429 en los tests.
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_AUTH_MAX = '3';
process.env.RATE_LIMIT_CREATE_MAX = '5';
process.env.RATE_LIMIT_REDIRECT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_REDIRECT_MAX = '10';

process.env.SHORT_CODE_LENGTH = process.env.SHORT_CODE_LENGTH || '6';
process.env.SHORT_CODE_MAX_RETRIES = process.env.SHORT_CODE_MAX_RETRIES || '5';
