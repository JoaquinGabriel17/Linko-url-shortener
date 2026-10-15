import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

// Verifica el token y devuelve el id del usuario solo si el payload trae un
// ObjectId válido. Devuelve null ante token inválido/expirado o payload sin id.
export function userIdFromToken(token) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded?.id || !mongoose.isValidObjectId(decoded.id)) {
      return null;
    }
    return decoded.id;
  } catch {
    return null;
  }
}
