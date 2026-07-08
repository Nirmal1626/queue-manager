import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { dbGet } from '../db.js';
import { generateToken } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const manager = await dbGet(
      'SELECT * FROM managers WHERE username = ?',
      [username]
    );

    if (!manager || !bcrypt.compareSync(password, manager.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const safeManager = {
      id: Number(manager.id),
      username: manager.username
    };

    const token = generateToken(safeManager);

    return res.json({
      token,
      manager: safeManager
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

export default router;