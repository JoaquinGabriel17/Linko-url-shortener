import express from 'express';
import { nanoid } from 'nanoid';
import Link from '../models/Link.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Crear nuevo link
router.post('/create', async (req, res) => {
  let { userId, originalUrl, shortCode } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    if(!shortCode) { shortCode = nanoid(6);}

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

//OBTENER LINKS DE UN USUARIO
router.get('/links', async (req, res) => {
  try {
    const {userId} = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'No se informó un user id' });
    }

    const { sort, limit } = req.query;

    const query = Link.find({ createdBy: userId });

    if (sort) {
      query.sort(sort); 
    }

    if (limit) {
      query.limit(Number(limit));
    }

    const links = await query.exec();

    res.json(links);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los links' });
  }
});


export default router;
