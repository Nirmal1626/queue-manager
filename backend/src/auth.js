import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'queue-manager-secret-key-change-in-production';

export function generateToken(manager) {
  return jwt.sign({ id: manager.id, username: manager.username }, JWT_SECRET, { expiresIn: '24h' });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.manager = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}