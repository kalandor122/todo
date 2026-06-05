import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color, sort_order } = req.body;
    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const id = uuid();
    const result = await pool.query(
      'INSERT INTO categories (id, name, color, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name.trim(), color || '#DC2626', sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        color = COALESCE($2, color),
        sort_order = COALESCE($3, sort_order)
       WHERE id = $4
       RETURNING *`,
      [name || null, color || null, sort_order !== undefined ? sort_order : null, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
