import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

function recordSnapshot(queueId) {
  const count = db
    .prepare("SELECT COUNT(*) as count FROM tokens WHERE queue_id = ? AND status = 'waiting'")
    .get(queueId).count;
  db.prepare('INSERT INTO queue_snapshots (queue_id, waiting_count) VALUES (?, ?)').run(queueId, count);
}

router.get('/', (req, res) => {
  const queues = db
    .prepare(`
      SELECT q.*,
        (SELECT COUNT(*) FROM tokens t WHERE t.queue_id = q.id AND t.status = 'waiting') as waiting_count
      FROM queues q
      WHERE q.manager_id = ?
      ORDER BY q.created_at DESC
    `)
    .all(req.manager.id);
  res.json(queues);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Queue name is required' });
  }

  const result = db
    .prepare('INSERT INTO queues (name, manager_id) VALUES (?, ?)')
    .run(name.trim(), req.manager.id);

  recordSnapshot(result.lastInsertRowid);

  const queue = db.prepare('SELECT * FROM queues WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...queue, waiting_count: 0 });
});

router.get('/:id', (req, res) => {
  const queue = db
    .prepare('SELECT * FROM queues WHERE id = ? AND manager_id = ?')
    .get(req.params.id, req.manager.id);

  if (!queue) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  const tokens = db
    .prepare(`
      SELECT * FROM tokens
      WHERE queue_id = ? AND status = 'waiting'
      ORDER BY position ASC
    `)
    .all(queue.id);

  res.json({ ...queue, tokens });
});

router.delete('/:id', (req, res) => {
  const queue = db
    .prepare('SELECT * FROM queues WHERE id = ? AND manager_id = ?')
    .get(req.params.id, req.manager.id);

  if (!queue) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  db.prepare('DELETE FROM queues WHERE id = ?').run(queue.id);
  res.json({ message: 'Queue deleted' });
});

export { recordSnapshot };
export default router;