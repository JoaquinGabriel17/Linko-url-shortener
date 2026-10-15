import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import links from './routes/links.js';
import auth from './routes/auth.js';
import urlRoutes from './routes/urlRoutes.js';

const app = express();

// Render corre detrás de un proxy: confiar en el primer hop para que el IP real
// (y por lo tanto el rate limiting) funcione.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  })
);
app.use(express.json());

// Rutas reales primero.
app.use('/links', links);
app.use('/auth', auth);

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// La redirección por short code va al final: /:shortCode captura cualquier
// segmento único, por lo que las rutas reales deben montarse antes.
app.use('/', urlRoutes);

export default app;
