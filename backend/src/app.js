import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import queueRoutes from './routes/queues.js';
import tokenRoutes from './routes/tokens.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const dbReady = initDb();

app.use(cors());
app.use(express.json());

app.use(async (_req, res, next) => {
  try {
    await dbReady;
    next();
  } catch {
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/queues', tokenRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;