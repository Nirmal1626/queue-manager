import { Router } from 'express';
import { dbGet, dbAll, dbRun, recordSnapshot } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const queues = await dbAll(
      `SELECT q.*,
        (SELECT COUNT(*) FROM tokens t WHERE t.queue_id = q.id AND t.status = 'waiting') as waiting_count
      FROM queues q
      WHERE q.manager_id = ?
      ORDER BY q.created_at DESC`,
      [req.manager.id]
    );
    res.json(queues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Queue name is required' });
    }

    const result = await dbRun('INSERT INTO queues (name, manager_id) VALUES (?, ?)', [
      name.trim(),
      req.manager.id,
    ]);

    await recordSnapshot(result.lastInsertRowid);

    const queue = await dbGet('SELECT * FROM queues WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ ...queue, waiting_count: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create queue' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const queue = await dbGet('SELECT * FROM queues WHERE id = ? AND manager_id = ?', [
      req.params.id,
      req.manager.id,
    ]);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const tokens = await dbAll(
      `SELECT * FROM tokens
      WHERE queue_id = ? AND status = 'waiting'
      ORDER BY position ASC`,
      [queue.id]
    );

    res.json({ ...queue, tokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const queue = await dbGet('SELECT * FROM queues WHERE id = ? AND manager_id = ?', [
      req.params.id,
      req.manager.id,
    ]);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    await dbRun('DELETE FROM queues WHERE id = ?', [queue.id]);
    res.json({ message: 'Queue deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete queue' });
  }
});

export default router;