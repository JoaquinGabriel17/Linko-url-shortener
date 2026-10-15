import express from 'express';
import { z } from 'zod';
import Link from '../models/Link.js';
import authMiddleware from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { createLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';
import * as shortCode from '../services/shortCode.js';
import { httpUrlSchema, normalizeUrl } from '../services/url.js';
import { aliasSchema } from '../services/alias.js';

const router = express.Router();

const MAX_LIMIT = 100;

// Id de Mongo: 24 hex. Validar antes de tocar la DB evita CastError/500.
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

// Body de creación. .strict() rechaza campos no declarados (mass assignment).
const createSchema = z
  .object({
    originalUrl: httpUrlSchema,
    shortCode: aliasSchema.optional(),
    name: z.string().trim().max(100, 'El nombre es demasiado largo').optional(),
    description: z.string().trim().max(300, 'La descripción es demasiado larga').optional(),
    forceNew: z.boolean().optional().default(false),
  })
  .strict();

// Solo estos campos son editables. El shortCode no se modifica en la edición.
const updateSchema = z
  .object({
    name: z.string().trim().max(100, 'El nombre es demasiado largo').optional(),
    description: z.string().trim().max(300, 'La descripción es demasiado larga').optional(),
    originalUrl: httpUrlSchema.optional(),
  })
  .strict();

const listQuerySchema = z.object({
  sort: z
    .enum(['clicks', 'createdAt', '-clicks', '-createdAt'], {
      error: 'Parámetro sort inválido',
    })
    .optional(),
  limit: z.coerce
    .number({ error: 'Parámetro limit inválido' })
    .int('Parámetro limit inválido')
    .min(1, 'Parámetro limit inválido')
    .optional(),
});

function buildResponse(link, deduplicated) {
  const body = {
    shortUrl: `${env.BASE_URL}/${link.shortCode}`,
    shortCode: link.shortCode,
    originalUrl: link.originalUrl,
  };
  if (deduplicated) {
    body.deduplicated = true;
  }
  return body;
}

// Crear nuevo link (anónimo o autenticado). Endpoint único de creación.
router.post('/create', createLimiter, optionalAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { originalUrl, shortCode: alias, name, description, forceNew } = parsed.data;
  const normalizedUrl = normalizeUrl(originalUrl);
  const userId = req.user?.id;

  // Los alias personalizados requieren sesión.
  if (alias && !userId) {
    return res.status(401).json({ message: 'Se requiere iniciar sesión para usar un alias' });
  }

  try {
    // Deduplicación: solo con usuario, sin alias, sin forceNew y sin metadata.
    if (userId && !alias && !forceNew && !name && !description) {
      const existing = await Link.findOne({ createdBy: userId, normalizedUrl });
      if (existing) {
        return res.status(200).json(buildResponse(existing, true));
      }
    }

    const baseData = { originalUrl, normalizedUrl, createdBy: userId };
    if (name) {
      baseData.name = name;
    }
    if (description) {
      baseData.description = description;
    }

    let link;

    if (alias) {
      // Alias explícito: sin reintento. Una colisión en shortCode es 409.
      try {
        link = new Link({ ...baseData, shortCode: alias });
        await link.save();
      } catch (error) {
        if (error?.code === 11000 && error?.keyPattern?.shortCode !== undefined) {
          return res.status(409).json({ message: 'El alias ya está en uso' });
        }
        throw error;
      }
    } else {
      // Código autogenerado con reintento ante colisión.
      link = await shortCode.createWithUniqueCode({
        Link,
        data: baseData,
        generate: shortCode.generateCode,
      });
    }

    return res.status(201).json(buildResponse(link, false));
  } catch (error) {
    if (error instanceof shortCode.ShortCodeCollisionError) {
      res.set('Retry-After', '1');
      return res
        .status(503)
        .json({ message: 'No se pudo generar un código único, intentá de nuevo' });
    }
    console.error('Error al crear link:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// Listar SOLO los links del usuario autenticado.
router.get('/', authMiddleware, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { sort, limit } = parsed.data;

  try {
    const query = Link.find({ createdBy: req.user.id });

    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      query.sort({ [field]: desc ? -1 : 1 });
    }

    if (limit !== undefined) {
      query.limit(Math.min(limit, MAX_LIMIT));
    }

    const links = await query.exec();
    // Se agrega shortUrl (mismo shape que la creación) para que el frontend no
    // tenga que construir el enlace corto ni conocer BASE_URL.
    res.json(
      links.map((link) => ({
        ...link.toObject(),
        shortUrl: `${env.BASE_URL}/${link.shortCode}`,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los links' });
  }
});

// Editar (PUT y PATCH comparten handler). Ownership por req.user.id; si el link
// no es del usuario o no existe, se responde 404 (no se revela existencia).
async function updateLink(req, res) {
  const idParsed = idSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(404).json({ message: 'Link no encontrado' });
  }

  // El shortCode es inmutable en la edición.
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'shortCode')) {
    return res.status(400).json({ message: 'El shortCode no se puede modificar' });
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
  }

  const update = { ...parsed.data };
  if (update.originalUrl !== undefined) {
    update.normalizedUrl = normalizeUrl(update.originalUrl);
  }

  try {
    const link = await Link.findOneAndUpdate(
      { _id: idParsed.data, createdBy: req.user.id },
      { $set: update },
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
  const idParsed = idSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(404).json({ message: 'Link no encontrado' });
  }

  try {
    const link = await Link.findOneAndDelete({ _id: idParsed.data, createdBy: req.user.id });

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
