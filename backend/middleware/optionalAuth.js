import { userIdFromToken } from './token.js';

// Auth opcional, con dos casos bien distintos:
// - Sin header Authorization → sigue como anónimo (comportamiento histórico).
// - Con header Authorization pero token inválido o expirado → 401, con el mismo
//   formato de error que middleware/auth.js. Así una sesión expirada no crea
//   enlaces huérfanos atribuidos erróneamente a un anónimo.
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta token' });
  }

  const userId = userIdFromToken(authHeader.split(' ')[1]);

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }

  req.user = { id: userId };
  next();
}

export default optionalAuth;
