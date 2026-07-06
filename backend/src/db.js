import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', 'queue.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function dbGet(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows[0] ?? null;
}

export async function dbAll(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

export async function dbRun(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: Number(result.lastInsertRowid),
    changes: result.rowsAffected,
  };
}

export async function dbBatch(statements) {
  await client.batch(statements, 'write');
}

export async function recordSnapshot(queueId) {
  const row = await dbGet(
    "SELECT COUNT(*) as count FROM tokens WHERE queue_id = ? AND status = 'waiting'",
    [queueId]
  );
  await dbRun('INSERT INTO queue_snapshots (queue_id, waiting_count) VALUES (?, ?)', [
    queueId,
    row.count,
  ]);
}

let initPromise = null;

export function initDb() {
  if (!initPromise) {
    initPromise = setup();
  }
  return initPromise;
}

async function setup() {
  await client.batch(
    [
      { sql: 'PRAGMA foreign_keys = ON' },
      {
        sql: `CREATE TABLE IF NOT EXISTS managers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS queues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          manager_id INTEGER NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          queue_id INTEGER NOT NULL,
          token_number INTEGER NOT NULL,
          person_name TEXT NOT NULL,
          position INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'waiting',
          created_at TEXT DEFAULT (datetime('now')),
          served_at TEXT,
          cancelled_at TEXT,
          FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS queue_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          queue_id INTEGER NOT NULL,
          waiting_count INTEGER NOT NULL,
          recorded_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE
        )`,
      },
    ],
    'write'
  );

  const managerCount = await dbGet('SELECT COUNT(*) as count FROM managers');
  if (managerCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await dbRun('INSERT INTO managers (username, password_hash) VALUES (?, ?)', ['admin', hash]);
  }
}

export default client;