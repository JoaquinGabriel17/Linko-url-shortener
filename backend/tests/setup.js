// Estas variables se setean ANTES de importar app.js (y por lo tanto
// config/env.js) para que la validación de zod pase en los tests.
// dotenv.config() no sobreescribe variables ya presentes en process.env.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/linko-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-para-vitest';
process.env.PORT = process.env.PORT || '10000';
// Vitest corre sobre Vite y Vite setea process.env.BASE_URL = "/" (su propio
// `base`). Por eso acá se sobreescribe sin condicionar, para que config/env.js
// vea una URL válida. En producción (node server.js) Vite no interviene.
process.env.BASE_URL = 'http://localhost:10000';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';


