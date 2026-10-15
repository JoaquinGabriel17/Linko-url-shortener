import { userIdFromToken } from './token.js';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta token' });
  }

  const token = authHeader.split(' ')[1];
  const userId = userIdFromToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }

  req.user = { id: userId };
  next();
}

export default authMiddleware;
