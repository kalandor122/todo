import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { v4 as uuid } from 'uuid';
import { recordDailyLog } from '../services/dailyLog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category_id, tag_id, priority, due_date, search } = req.query;
    let sql = `
      SELECT t.*, c.name as category_name, c.color as category_color,
        COALESCE(
          json_agg(json_build_object('id', tg.id, 'name', tg.name))
          FILTER (WHERE tg.id IS NOT NULL), '[]'
        ) as tags,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', st.id, 'title', st.title, 'status', st.status,
            'priority', st.priority, 'due_date', st.due_date,
            'completed_at', st.completed_at, 'category_id', st.category_id,
            'is_ai_generated', st.is_ai_generated, 'created_at', st.created_at
          ) ORDER BY st.created_at ASC)
          FROM tasks st
          WHERE st.parent_task_id = t.id), '[]'
        ) as subtasks
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
    `;
    const conditions: string[] = ['t.parent_task_id IS NULL'];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`t.category_id = $${params.length}`);
    }
    if (tag_id) {
      params.push(tag_id);
      conditions.push(`tg.id = $${params.length}`);
    }
    if (priority) {
      params.push(Number(priority));
      conditions.push(`t.priority = $${params.length}`);
    }
    if (due_date) {
      params.push(due_date);
      conditions.push(`t.due_date = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`t.title ILIKE $${params.length}`);
    }

    sql += ' WHERE ' + conditions.join(' AND ');

    sql += ' GROUP BY t.id, c.name, c.color ORDER BY t.due_date ASC NULLS LAST, t.priority ASC, t.created_at DESC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      res.status(400).json({ error: 'start and end query params required' });
      return;
    }
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.due_date >= $1 AND t.due_date <= $2
       ORDER BY t.due_date ASC, t.priority ASC`,
      [start, end]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching calendar tasks:', err);
    res.status(500).json({ error: 'Failed to fetch calendar tasks' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const task = result.rows[0];

    const tagsResult = await pool.query(
      `SELECT tg.id, tg.name FROM tags tg
       JOIN task_tags tt ON tg.id = tt.tag_id
       WHERE tt.task_id = $1`,
      [id]
    );
    task.tags = tagsResult.rows;

    const subtasksResult = await pool.query(
      `SELECT * FROM tasks WHERE parent_task_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    task.subtasks = subtasksResult.rows;

    res.json(task);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, priority, due_date, category_id, tags, parent_task_id } = req.body;

    if (!title || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const id = uuid();
    const result = await pool.query(
      `INSERT INTO tasks (id, title, description, priority, due_date, category_id, parent_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, title.trim(), description || '', priority || 2, due_date || null, category_id || null, parent_task_id || null]
    );

    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        await pool.query(
          'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagId]
        );
      }
    }

    const task = result.rows[0];
    task.tags = tags || [];

    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, status, priority, due_date, category_id, tags } = req.body;

    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const now = new Date().toISOString();
    const completedAt = status === 'completed' ? now : status === 'pending' ? null : undefined;

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        category_id = COALESCE($6, category_id),
        completed_at = CASE WHEN $7::timestamptz IS NOT NULL THEN $7::timestamptz WHEN $7::text = 'null' THEN NULL ELSE completed_at END,
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        title || null,
        description !== undefined ? description : null,
        status || null,
        priority || null,
        due_date !== undefined ? due_date : null,
        category_id !== undefined ? category_id : null,
        completedAt !== undefined ? completedAt : null,
        id,
      ]
    );

    if (tags !== undefined) {
      await pool.query('DELETE FROM task_tags WHERE task_id = $1', [id]);
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tagId of tags) {
          await pool.query(
            'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, tagId]
          );
        }
      }
    }

    const updated = result.rows[0];
    await recordDailyLog().catch((e) => console.error('DailyLog error:', e));

    res.json(updated);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
