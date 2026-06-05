import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const limit = Math.min(Math.max(Number(days) || 30, 1), 365);
    const result = await pool.query(
      `SELECT * FROM daily_logs ORDER BY date DESC LIMIT $1`,
      [limit]
    );
    res.json(result.rows.reverse());
  } catch (err) {
    console.error('Error fetching daily analytics:', err);
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT date, tasks_completed
       FROM daily_logs
       WHERE date >= NOW() - INTERVAL '365 days'
       ORDER BY date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching heatmap data:', err);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [total, completed, pending, rolled, logs] = await Promise.all([
      pool.query("SELECT COUNT(*)::int as count FROM tasks WHERE parent_task_id IS NULL"),
      pool.query("SELECT COUNT(*)::int as count FROM tasks WHERE status = 'completed' AND parent_task_id IS NULL"),
      pool.query("SELECT COUNT(*)::int as count FROM tasks WHERE status = 'pending' AND parent_task_id IS NULL"),
      pool.query("SELECT COUNT(*)::int as count FROM tasks WHERE status = 'rolled_over' AND parent_task_id IS NULL"),
      pool.query('SELECT date, tasks_completed FROM daily_logs ORDER BY date DESC'),
    ]);

    let streak = 0;
    const rows = logs.rows;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.tasks_completed === 0) break;

      const rowDate = new Date(row.date);
      rowDate.setHours(0, 0, 0, 0);

      if (streak === 0) {
        const diffFromToday = Math.round((today.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffFromToday > 1) break;
        streak = 1;
      } else {
        const prevRow = rows[i - 1];
        const prevDate = new Date(prevRow.date);
        prevDate.setHours(0, 0, 0, 0);
        const diff = Math.round((prevDate.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
    }

    res.json({
      total: total.rows[0].count,
      completed: completed.rows[0].count,
      pending: pending.rows[0].count,
      rolled_over: rolled.rows[0].count,
      streak,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
