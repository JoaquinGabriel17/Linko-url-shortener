import express from 'express';
import Link from '../models/Link.js';
import { nanoid } from 'nanoid'; // para generar shortCode único
import authMiddleware from '../middleware/auth.js'; // asumiendo que ya tenés auth

const router = express.Router();

// Crear nuevo link
router.post('/create', authMiddleware, async (req, res) => {
  const { originalUrl } = req.body;
  const userId = req.user.id; // viene del token verificado

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const shortCode = nanoid(6);

    const newLink = new Link({
      originalUrl,
      shortCode,
      createdBy: userId,
    });

    await newLink.save();

    res.status(201).json({
      message: 'Link creado exitosamente',
      shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`,
    });
  } catch (error) {
    console.error('Error al crear link:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
