import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import Link from '../models/Link.js';
import authMiddleware from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { createLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';

const router = express.Router();

const MAX_LIMIT = 100;
const SORTABLE_FIELDS = new Set(['clicks', 'createdAt']);

const httpUrl = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Debe ser una URL http/https válida');

// Solo estos campos son editables. .strict() rechaza cualquier otro (evita
// mass assignment sobre clicks, createdBy, shortCode, etc.).
const updateSchema = z
  .object({
    name: z.string().trim().max(100, 'El nombre es demasiado largo').optional(),
    description: z.string().trim().max(300, 'La descripción es demasiado larga').optional(),
    originalUrl: httpUrl.optional(),
  })
  .strict();

// Crear nuevo link (anónimo o autenticado). Endpoint único de creación.
router.post('/create', createLimiter, optionalAuth, async (req, res) => {
  const { originalUrl, shortCode, name, description } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const code = shortCode || nanoid(6);

    const linkData = {
      originalUrl,
      shortCode: code,
      createdBy: req.user?.id,
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
      shortUrl: `${env.BASE_URL}/${code}`,
      shortCode: code,
      originalUrl,
    });
  } catch (error) {
    console.error('Error al crear link:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Listar SOLO los links del usuario autenticado.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { sort, limit } = req.query;
    const query = Link.find({ createdBy: req.user.id });

    if (sort !== undefined) {
      const raw = String(sort);
      const field = raw.startsWith('-') ? raw.slice(1) : raw;
      if (!SORTABLE_FIELDS.has(field)) {
        return res.status(400).json({ message: 'Parámetro sort inválido' });
      }
      query.sort({ [field]: raw.startsWith('-') ? -1 : 1 });
    }

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ message: 'Parámetro limit inválido' });
      }
      query.limit(Math.min(parsedLimit, MAX_LIMIT));
    }

    const links = await query.exec();
    res.json(links);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los links' });
  }
});

// Editar (PUT y PATCH comparten handler). Ownership por req.user.id; si el link
// no es del usuario o no existe, se responde 404 (no se revela existencia).
async function updateLink(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: 'Link no encontrado' });
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
  }

  try {
    const link = await Link.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!link) {
      return res.status(404).json({ message: 'Link no encontrado' });
    }

    res.json({ message: 'Link editado correctamente', link });
  } catch (error) {
    console.error('Error al editar link:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

router.put('/:id', authMiddleware, updateLink);
router.patch('/:id', authMiddleware, updateLink);

// Eliminar un link del usuario.
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: 'Link no encontrado' });
  }

  try {
    const link = await Link.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!link) {
      return res.status(404).json({ message: 'Link no encontrado' });
    }

    res.json({ message: 'Link eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;
