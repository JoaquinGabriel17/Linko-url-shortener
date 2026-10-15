import mongoose from 'mongoose';
import { validateUrl } from '../services/url.js';

const linkSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      // Defensa en profundidad: ninguna URL inválida debe persistirse, incluso
      // si algún camino de escritura esquiva la validación de la ruta.
      validate: {
        validator: (value) => validateUrl(value).valid,
        message: 'La URL original no es válida',
      },
    },
    normalizedUrl: {
      type: String,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
    },
    // Sin defaults: si el usuario no los envía quedan vacíos (undefined) y el
    // frontend muestra su propio fallback visual, en vez de guardar textos
    // engañosos como si fueran datos reales.
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Índice para la deduplicación por usuario + URL normalizada.
linkSchema.index({ createdBy: 1, normalizedUrl: 1 });

const Link = mongoose.model('Link', linkSchema);
export default Link;
