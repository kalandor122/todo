import { pool } from '../db/pool.js';

export async function recordDailyLog(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed' AND completed_at::date = $1 AND parent_task_id IS NULL) as completed,
       COUNT(*) FILTER (WHERE status = 'pending' AND parent_task_id IS NULL) as pending,
       COUNT(*) FILTER (WHERE status = 'rolled_over' AND parent_task_id IS NULL) as rolled
     FROM tasks`,
    [today]
  );

  const { completed, pending, rolled } = result.rows[0];

  await pool.query(
    `INSERT INTO daily_logs (date, tasks_completed, tasks_pending, tasks_rolled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (date) DO UPDATE SET
       tasks_completed = EXCLUDED.tasks_completed,
       tasks_pending = EXCLUDED.tasks_pending,
       tasks_rolled = EXCLUDED.tasks_rolled`,
    [today, completed, pending, rolled]
  );
}
