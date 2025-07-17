import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import urlRoutes from './routes/urlRoutes.js';
import links from './routes/links.js';
import auth from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.use(cors({
  origin: 'https://url-shortener-xi-lac.vercel.app', // tu dominio Vercel
  credentials: true
}));

app.use('/', urlRoutes);
app.use('/links', links);
app.use('/auth', auth);

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conectado a MongoDB');
  app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
})
.catch(err => console.error('Error al conectar a MongoDB:', err));
