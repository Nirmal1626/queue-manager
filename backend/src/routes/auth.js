import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const manager = db.prepare('SELECT * FROM managers WHERE username = ?').get(username);
  if (!manager || !bcrypt.compareSync(password, manager.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(manager);
  res.json({ token, manager: { id: manager.id, username: manager.username } });
});

export default router;