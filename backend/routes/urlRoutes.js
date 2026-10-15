import express from 'express';
import Link from '../models/Link.js';
import { redirectLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Redirección por short code.
router.get('/:shortCode', redirectLimiter, async (req, res) => {
  const { shortCode } = req.params;

  try {
    // findOneAndUpdate con $inc resuelve el link y cuenta el clic en una sola
    // operación atómica (evita perder clics y race conditions).
    const link = await Link.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!link) {
      return res.status(404).json({ error: 'URL no encontrada' });
    }

    // 302 (temporal) y no 301 (permanente): un 301 queda cacheado por el
    // navegador y los buscadores; el cliente usaría la copia cacheada sin volver
    // a pegarle al backend, por lo que dejaríamos de contar clics y no podríamos
    // cambiar el destino sin que el usuario limpie caché.
    res.redirect(302, link.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la redirección' });
  }
});

export default router;
