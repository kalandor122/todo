import cron from 'node-cron';
import { pool } from '../db/pool.js';
import { recordDailyLog } from '../services/dailyLog.js';

export function startRolloverJob() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[Rollover] Starting midnight rollover...');
    try {
      await recordDailyLog().catch((e) => console.error('[Rollover] record error:', e));

      const tasksToRoll = await pool.query(
        `SELECT * FROM tasks
         WHERE status = 'pending'
           AND parent_task_id IS NULL`
      );

      let rolledCount = 0;
      for (const task of tasksToRoll.rows) {
        const newTask = await pool.query(
          `INSERT INTO tasks (title, description, priority, category_id, is_ai_generated)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [task.title, task.description, task.priority, task.category_id, task.is_ai_generated]
        );

        await pool.query(
          `UPDATE tasks SET status = 'rolled_over', updated_at = NOW() WHERE id = $1`,
          [task.id]
        );
        rolledCount++;

        const subtasks = await pool.query(
          `SELECT * FROM tasks WHERE parent_task_id = $1`,
          [task.id]
        );
        for (const sub of subtasks.rows) {
          await pool.query(
            `INSERT INTO tasks (title, description, priority, category_id, parent_task_id, is_ai_generated)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [sub.title, sub.description, sub.priority, sub.category_id, newTask.rows[0].id, sub.is_ai_generated]
          );
          await pool.query(
            `UPDATE tasks SET status = 'rolled_over', updated_at = NOW() WHERE id = $1`,
            [sub.id]
          );
        }
      }

      await recordDailyLog().catch((e) => console.error('[Rollover] record error:', e));

      console.log(`[Rollover] Rolled ${rolledCount} tasks (with subtasks) to today`);
    } catch (err) {
      console.error('[Rollover] Error during rollover:', err);
    }
  });

  console.log('[Rollover] Cron job scheduled for midnight');
}
