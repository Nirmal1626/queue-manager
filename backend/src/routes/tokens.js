import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { recordSnapshot } from './queues.js';

const router = Router();
router.use(authMiddleware);

function getQueueForManager(queueId, managerId) {
  return db.prepare('SELECT * FROM queues WHERE id = ? AND manager_id = ?').get(queueId, managerId);
}

function getNextTokenNumber(queueId) {
  const max = db
    .prepare('SELECT MAX(token_number) as max_num FROM tokens WHERE queue_id = ?')
    .get(queueId);
  return (max.max_num || 0) + 1;
}

function getNextPosition(queueId) {
  const max = db
    .prepare("SELECT MAX(position) as max_pos FROM tokens WHERE queue_id = ? AND status = 'waiting'")
    .get(queueId);
  return (max.max_pos || 0) + 1;
}

router.post('/:queueId/tokens', (req, res) => {
  const queue = getQueueForManager(req.params.queueId, req.manager.id);
  if (!queue) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  const { person_name } = req.body;
  if (!person_name?.trim()) {
    return res.status(400).json({ error: 'Person name is required' });
  }

  const tokenNumber = getNextTokenNumber(queue.id);
  const position = getNextPosition(queue.id);

  const result = db
    .prepare(
      'INSERT INTO tokens (queue_id, token_number, person_name, position) VALUES (?, ?, ?, ?)'
    )
    .run(queue.id, tokenNumber, person_name.trim(), position);

  recordSnapshot(queue.id);

  const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(token);
});

router.post('/:queueId/tokens/:tokenId/move-up', (req, res) => {
  const queue = getQueueForManager(req.params.queueId, req.manager.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  const token = db
    .prepare("SELECT * FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'")
    .get(req.params.tokenId, queue.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });
  if (token.position <= 1) return res.status(400).json({ error: 'Token is already at the top' });

  const above = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' AND position = ?")
    .get(queue.id, token.position - 1);

  if (above) {
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE tokens SET position = ? WHERE id = ?').run(token.position, above.id);
      db.prepare('UPDATE tokens SET position = ? WHERE id = ?').run(token.position - 1, token.id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const tokens = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC")
    .all(queue.id);
  res.json(tokens);
});

router.post('/:queueId/tokens/:tokenId/move-down', (req, res) => {
  const queue = getQueueForManager(req.params.queueId, req.manager.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  const token = db
    .prepare("SELECT * FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'")
    .get(req.params.tokenId, queue.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  const maxPos = db
    .prepare("SELECT MAX(position) as max_pos FROM tokens WHERE queue_id = ? AND status = 'waiting'")
    .get(queue.id);
  if (token.position >= maxPos.max_pos) {
    return res.status(400).json({ error: 'Token is already at the bottom' });
  }

  const below = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' AND position = ?")
    .get(queue.id, token.position + 1);

  if (below) {
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE tokens SET position = ? WHERE id = ?').run(token.position, below.id);
      db.prepare('UPDATE tokens SET position = ? WHERE id = ?').run(token.position + 1, token.id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const tokens = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC")
    .all(queue.id);
  res.json(tokens);
});

router.post('/:queueId/serve-next', (req, res) => {
  const queue = getQueueForManager(req.params.queueId, req.manager.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  const topToken = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC LIMIT 1")
    .get(queue.id);

  if (!topToken) {
    return res.status(400).json({ error: 'No tokens waiting in queue' });
  }

  db.prepare("UPDATE tokens SET status = 'served', served_at = datetime('now') WHERE id = ?").run(
    topToken.id
  );

  db.prepare("UPDATE tokens SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?")
    .run(queue.id, topToken.position);

  recordSnapshot(queue.id);

  const served = db.prepare('SELECT * FROM tokens WHERE id = ?').get(topToken.id);
  const remaining = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC")
    .all(queue.id);

  res.json({ served, remaining });
});

router.post('/:queueId/tokens/:tokenId/cancel', (req, res) => {
  const queue = getQueueForManager(req.params.queueId, req.manager.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found' });

  const token = db
    .prepare("SELECT * FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'")
    .get(req.params.tokenId, queue.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  db.prepare("UPDATE tokens SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?").run(
    token.id
  );

  db.prepare("UPDATE tokens SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?")
    .run(queue.id, token.position);

  recordSnapshot(queue.id);

  const tokens = db
    .prepare("SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC")
    .all(queue.id);
  res.json(tokens);
});

export default router;