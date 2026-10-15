import express from 'express';
import { z } from 'zod';
import Link from '../models/Link.js';
import { redirectLimiter } from '../middleware/rateLimit.js';
import { ALIAS_REGEX, MIN_ALIAS_LENGTH, MAX_ALIAS_LENGTH } from '../services/alias.js';

const router = express.Router();

// El shortCode solo admite el charset de alias y su rango de longitud. Un valor
// malformado se trata como no encontrado (404) sin pegarle a la DB.
const shortCodeParamSchema = z
  .string()
  .min(MIN_ALIAS_LENGTH)
  .max(MAX_ALIAS_LENGTH)
  .regex(ALIAS_REGEX);

// Redirección por short code.
router.get('/:shortCode', redirectLimiter, async (req, res) => {
  const parsed = shortCodeParamSchema.safeParse(req.params.shortCode);

  if (!parsed.success) {
    return res.status(404).json({ error: 'URL no encontrada' });
  }

  const shortCode = parsed.data;

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
