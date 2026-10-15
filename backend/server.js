import mongoose from 'mongoose';

import app from './app.js';
import { env } from './config/env.js';

mongoose
  .connect(env.MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    app.listen(env.PORT, () => console.log(`Servidor corriendo en puerto ${env.PORT}`));
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });
