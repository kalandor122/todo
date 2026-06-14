import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// Sensitive keys that must never be exposed to the client
const SENSITIVE_KEYS = new Set([
  'MINIMAX_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'MQTT_PASSWORD',
  'google_tokens',
]);

// Whitelist of settings keys that clients are allowed to update
const ALLOWED_SETTINGS_KEYS = new Set([
  'MINIMAX_API_KEY',
  'MINIMAX_MODEL',
  'AI_BASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MQTT_HOST',
  'MQTT_PORT',
  'MQTT_USERNAME',
  'MQTT_PASSWORD',
  'HA_TODO_DEVICE_ID',
]);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      // Never expose sensitive keys to the client
      if (SENSITIVE_KEYS.has(row.key)) {
        settings[row.key] = row.value ? '••••••••' : '';
        continue;
      }
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

    // Reject any keys not in the whitelist
    const disallowed = Object.keys(entries).filter(k => !ALLOWED_SETTINGS_KEYS.has(k));
    if (disallowed.length > 0) {
      res.status(403).json({ error: `Disallowed setting keys: ${disallowed.join(', ')}` });
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
