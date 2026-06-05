import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const id = uuid();
    const result = await pool.query(
      'INSERT INTO tags (id, name) VALUES ($1, $2) RETURNING *',
      [id, name.trim().toLowerCase()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tags WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
