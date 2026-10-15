import { userIdFromToken } from './token.js';

// Auth opcional: si viene un token válido (con id válido) setea req.user; si no,
// continúa como anónimo, sin cortar la request.
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userId = userIdFromToken(authHeader.split(' ')[1]);
    if (userId) {
      req.user = { id: userId };
    }
  }

  next();
}

export default optionalAuth;
