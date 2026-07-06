import { Router } from 'express';
import { dbGet, dbAll } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const managerId = req.manager.id;

    const overview = await dbGet(
      `SELECT
        (SELECT COUNT(*) FROM queues WHERE manager_id = ?) as total_queues,
        (SELECT COUNT(*) FROM tokens t JOIN queues q ON t.queue_id = q.id
         WHERE q.manager_id = ? AND t.status = 'waiting') as total_waiting,
        (SELECT COUNT(*) FROM tokens t JOIN queues q ON t.queue_id = q.id
         WHERE q.manager_id = ? AND t.status = 'served') as total_served,
        (SELECT COUNT(*) FROM tokens t JOIN queues q ON t.queue_id = q.id
         WHERE q.manager_id = ? AND t.status = 'cancelled') as total_cancelled`,
      [managerId, managerId, managerId, managerId]
    );

    const avgWaitTime = await dbGet(
      `SELECT AVG(
        (julianday(t.served_at) - julianday(t.created_at)) * 24 * 60
      ) as avg_wait_minutes
      FROM tokens t
      JOIN queues q ON t.queue_id = q.id
      WHERE q.manager_id = ? AND t.status = 'served' AND t.served_at IS NOT NULL`,
      [managerId]
    );

    const waitTimeByQueue = await dbAll(
      `SELECT q.name as queue_name,
        AVG((julianday(t.served_at) - julianday(t.created_at)) * 24 * 60) as avg_wait_minutes,
        COUNT(t.id) as served_count
      FROM tokens t
      JOIN queues q ON t.queue_id = q.id
      WHERE q.manager_id = ? AND t.status = 'served' AND t.served_at IS NOT NULL
      GROUP BY q.id
      ORDER BY served_count DESC`,
      [managerId]
    );

    const queueLengthTrend = await dbAll(
      `SELECT qs.recorded_at, qs.waiting_count, q.name as queue_name
      FROM queue_snapshots qs
      JOIN queues q ON qs.queue_id = q.id
      WHERE q.manager_id = ?
      ORDER BY qs.recorded_at ASC
      LIMIT 100`,
      [managerId]
    );

    const recentActivity = await dbAll(
      `SELECT t.token_number, t.person_name, t.status, t.created_at, t.served_at, t.cancelled_at, q.name as queue_name
      FROM tokens t
      JOIN queues q ON t.queue_id = q.id
      WHERE q.manager_id = ?
      ORDER BY COALESCE(t.served_at, t.cancelled_at, t.created_at) DESC
      LIMIT 20`,
      [managerId]
    );

    const hourlyVolume = await dbAll(
      `SELECT strftime('%H', t.created_at) as hour,
        COUNT(*) as count
      FROM tokens t
      JOIN queues q ON t.queue_id = q.id
      WHERE q.manager_id = ?
      GROUP BY hour
      ORDER BY hour ASC`,
      [managerId]
    );

    res.json({
      overview: {
        ...overview,
        avg_wait_minutes: Math.round((avgWaitTime?.avg_wait_minutes || 0) * 10) / 10,
      },
      waitTimeByQueue: waitTimeByQueue.map((r) => ({
        ...r,
        avg_wait_minutes: Math.round((r.avg_wait_minutes || 0) * 10) / 10,
      })),
      queueLengthTrend,
      recentActivity,
      hourlyVolume,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;