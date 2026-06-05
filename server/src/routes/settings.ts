import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const entries = req.body;
    if (typeof entries !== 'object' || entries === null) {
      res.status(400).json({ error: 'Body must be a key-value object' });
      return;
    }

    for (const [key, value] of Object.entries(entries)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, JSON.stringify(value)]
      );
    }

    res.json({ saved: true });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
