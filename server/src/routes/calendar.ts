import { Router, Request, Response } from 'express';
import { getAuthUrl, handleCallback } from '../services/calendar.js';

const router = Router();

router.get('/auth', (_req: Request, res: Response) => {
  const url = getAuthUrl();
  res.redirect(url);
});

router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code missing' });
      return;
    }
    await handleCallback(code);
    res.redirect('http://localhost:5173/settings');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

export default router;
