import { Router, Request, Response } from 'express';
import { breakDownTask } from '../services/ai.js';

const router = Router();

router.post('/:id/break-down', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const subtasks = await breakDownTask(id);
    res.json({ subtasks });
  } catch (err: any) {
    console.error('Error breaking down task:', err);
    res.status(500).json({ error: err.message || 'Failed to break down task' });
  }
});

export default router;
