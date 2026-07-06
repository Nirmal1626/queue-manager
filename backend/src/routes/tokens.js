import { Router } from 'express';
import { dbGet, dbAll, dbRun, dbBatch, recordSnapshot } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

async function getQueueForManager(queueId, managerId) {
  return dbGet('SELECT * FROM queues WHERE id = ? AND manager_id = ?', [queueId, managerId]);
}

async function getNextTokenNumber(queueId) {
  const max = await dbGet('SELECT MAX(token_number) as max_num FROM tokens WHERE queue_id = ?', [
    queueId,
  ]);
  return (max?.max_num || 0) + 1;
}

async function getNextPosition(queueId) {
  const max = await dbGet(
    "SELECT MAX(position) as max_pos FROM tokens WHERE queue_id = ? AND status = 'waiting'",
    [queueId]
  );
  return (max?.max_pos || 0) + 1;
}

async function getWaitingTokens(queueId) {
  return dbAll(
    "SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC",
    [queueId]
  );
}

router.post('/:queueId/tokens', async (req, res) => {
  try {
    const queue = await getQueueForManager(req.params.queueId, req.manager.id);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const { person_name } = req.body;
    if (!person_name?.trim()) {
      return res.status(400).json({ error: 'Person name is required' });
    }

    const tokenNumber = await getNextTokenNumber(queue.id);
    const position = await getNextPosition(queue.id);

    const result = await dbRun(
      'INSERT INTO tokens (queue_id, token_number, person_name, position) VALUES (?, ?, ?, ?)',
      [queue.id, tokenNumber, person_name.trim(), position]
    );

    await recordSnapshot(queue.id);

    const token = await dbGet('SELECT * FROM tokens WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(token);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add token' });
  }
});

router.post('/:queueId/tokens/:tokenId/move-up', async (req, res) => {
  try {
    const queue = await getQueueForManager(req.params.queueId, req.manager.id);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const token = await dbGet(
      "SELECT * FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'",
      [req.params.tokenId, queue.id]
    );
    if (!token) return res.status(404).json({ error: 'Token not found' });
    if (token.position <= 1) return res.status(400).json({ error: 'Token is already at the top' });

    const above = await dbGet(
      "SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' AND position = ?",
      [queue.id, token.position - 1]
    );

    if (above) {
      await dbBatch([
        { sql: 'UPDATE tokens SET position = ? WHERE id = ?', args: [token.position, above.id] },
        { sql: 'UPDATE tokens SET position = ? WHERE id = ?', args: [token.position - 1, token.id] },
      ]);
    }

    res.json(await getWaitingTokens(queue.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to move token' });
  }
});

router.post('/:queueId/tokens/:tokenId/move-down', async (req, res) => {
  try {
    const queue = await getQueueForManager(req.params.queueId, req.manager.id);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const token = await dbGet(
      "SELECT * FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'",
      [req.params.tokenId, queue.id]
    );
    if (!token) return res.status(404).json({ error: 'Token not found' });

    const maxPos = await dbGet(
      "SELECT MAX(position) as max_pos FROM tokens WHERE queue_id = ? AND status = 'waiting'",
      [queue.id]
    );
    if (token.position >= maxPos.max_pos) {
      return res.status(400).json({ error: 'Token is already at the bottom' });
    }

    const below = await dbGet(
      "SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' AND position = ?",
      [queue.id, token.position + 1]
    );

    if (below) {
      await dbBatch([
        { sql: 'UPDATE tokens SET position = ? WHERE id = ?', args: [token.position, below.id] },
        { sql: 'UPDATE tokens SET position = ? WHERE id = ?', args: [token.position + 1, token.id] },
      ]);
    }

    res.json(await getWaitingTokens(queue.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to move token' });
  }
});

router.post('/:queueId/serve-next', async (req, res) => {
  try {
    const queue = await getQueueForManager(req.params.queueId, req.manager.id);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const topToken = await dbGet(
      "SELECT * FROM tokens WHERE queue_id = ? AND status = 'waiting' ORDER BY position ASC LIMIT 1",
      [queue.id]
    );

    if (!topToken) {
      return res.status(400).json({ error: 'No tokens waiting in queue' });
    }

    await dbBatch([
      {
        sql: "UPDATE tokens SET status = 'served', served_at = datetime('now') WHERE id = ?",
        args: [topToken.id],
      },
      {
        sql: "UPDATE tokens SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?",
        args: [queue.id, topToken.position],
      },
    ]);

    await recordSnapshot(queue.id);

    const served = await dbGet('SELECT * FROM tokens WHERE id = ?', [topToken.id]);
    const remaining = await getWaitingTokens(queue.id);

    res.json({ served, remaining });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to serve next token' });
  }
});

router.post('/:queueId/tokens/:tokenId/cancel', async (req, res) => {
  try {
    const queue = await getQueueForManager(req.params.queueId, req.manager.id);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const token = await dbGet(
      "SELECT * FROM tokens WHERE id = ? AND queue_id = ? AND status = 'waiting'",
      [req.params.tokenId, queue.id]
    );
    if (!token) return res.status(404).json({ error: 'Token not found' });

    await dbBatch([
      {
        sql: "UPDATE tokens SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?",
        args: [token.id],
      },
      {
        sql: "UPDATE tokens SET position = position - 1 WHERE queue_id = ? AND status = 'waiting' AND position > ?",
        args: [queue.id, token.position],
      },
    ]);

    await recordSnapshot(queue.id);

    res.json(await getWaitingTokens(queue.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel token' });
  }
});

export default router;