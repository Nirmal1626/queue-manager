import express from 'express';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import queueRoutes from './routes/queues.js';
import tokenRoutes from './routes/tokens.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/queues', tokenRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Queue Manager API running on http://localhost:${PORT}`);
});