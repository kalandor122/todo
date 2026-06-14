import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import { env } from './config/env.js';
import { startRolloverJob } from './jobs/rollover.js';
import tasksRouter from './routes/tasks.js';
import categoriesRouter from './routes/categories.js';
import tagsRouter from './routes/tags.js';

import analyticsRouter from './routes/analytics.js';
import settingsRouter from './routes/settings.js';
import aiRouter from './routes/ai.js';
import calendarRouter from './routes/calendar.js';
import { startMqttBridge } from './services/mqttBridge.js';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const app = express();

// CORS: allow all by default, restrict via CORS_ORIGIN env var in production
const corsOptions: cors.CorsOptions = { origin: true }; // reflect request origin
if (process.env.CORS_ORIGIN) {
  const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((s: string) => s.trim());
  corsOptions.origin = (origin: string | undefined, callback: cors.Callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };
}
app.use(cors(corsOptions));

// Body parser with size limit (1MB)
app.use(express.json({ limit: '1mb' }));

// TODO: Add authentication middleware here (e.g., passport, JWT, session-based auth)
// For now, all endpoints are publicly accessible. This MUST be addressed before production use.
// Example: app.use('/api', authMiddleware);

const publicPath = join(process.cwd(), 'public');
if (existsSync(publicPath)) {
  console.log('[Server] Serving static files from', publicPath);
  app.use(express.static(publicPath));
} else {
  console.log('[Server] No static files found at', publicPath, '- API only mode');
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);

app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/calendar', calendarRouter);

async function runMigrations() {
  const schemaPath = join(process.cwd(), 'dist', 'db', 'schema.sql');
  if (existsSync(schemaPath)) {
    const sql = readFileSync(schemaPath, 'utf-8');
    await pool.query(sql);
    console.log('Database schema applied');
  } else {
    console.log('Schema file not found at', schemaPath);
  }
}

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
    await runMigrations();

    startRolloverJob();
    startMqttBridge();

    app.get('*', (_req, res) => {
      const indexPath = join(publicPath, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });

    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
