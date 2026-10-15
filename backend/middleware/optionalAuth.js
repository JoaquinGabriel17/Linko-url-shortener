import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Auth opcional: si viene un token válido setea req.user; si no (o si es
// inválido) continúa como anónimo, sin cortar la request.
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
  } catch {
    // token inválido -> sigue como anónimo
  }

  next();
}

export default optionalAuth;
