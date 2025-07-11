import express from 'express';
import { nanoid } from 'nanoid';
import Link from '../models/Link.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Crear nuevo link
router.post('/create',authMiddleware, async (req, res) => {
  let { userId, originalUrl, shortCode, name, description } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    if(!shortCode) { shortCode = nanoid(6);}

    const linkData = {
      originalUrl,
      shortCode,
      createdBy: userId,
    };
  
    if (name) {
      linkData.name = name;
    }
    if (description) {
      linkData.description = description;
    }

    const newLink = new Link(linkData);
  

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
router.get('/links',authMiddleware, async (req, res) => {
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

//ELIMINAR LINK
router.delete('/delete',authMiddleware, async (req, res) => {
  try {
    const {linkId, userId} = req.query;

    if (!linkId) {
      return res.status(401).json({ message: 'No se informó un link id' });
    }

    const query = Link.findById(linkId);
    const link = await query.exec();
    if (!link) {
      return res.status(404).json({ message: 'Link no encontrado' });
    }
    
    if (link.createdBy.toString() !== userId) {
      return res.status(401).json({ message: 'El link no pertenece al usuario' });
    }

    await Link.findByIdAndDelete(linkId);

    res.json({ message: 'Link eliminado correctamente'});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los links' });
  }
});

//EDITAR UN LINK
router.put('/edit', authMiddleware, async (req, res) => {
  try {
    const { linkId, userId, name, description, originalUrl } = req.body;

    if (!linkId) {
      return res.status(400).json({ message: 'No se informó un link id' });
    }

    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Link no encontrado' });
    }

    if (link.createdBy.toString() !== userId) {
      return res.status(401).json({ message: 'El link no pertenece al usuario' });
    }

    if (name !== undefined) link.name = name;
    if (description !== undefined) link.description = description;
    if (originalUrl !== undefined) link.originalUrl = originalUrl;

    await link.save();

    res.json({ message: 'Link editado correctamente', link });
  } catch (error) {
    console.error('Error al editar link:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;
