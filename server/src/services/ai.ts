import OpenAI from 'openai';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { v4 as uuid } from 'uuid';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!env.MINIMAX_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: env.MINIMAX_API_KEY,
      baseURL: env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
    });
  }
  return client;
}

interface Subtask {
  title: string;
}

export async function breakDownTask(taskId: string): Promise<Subtask[]> {
  const ai = getClient();
  if (!ai) {
    throw new Error('MiniMax API key not configured. Set MINIMAX_API_KEY in settings.');
  }

  const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
  if (task.rows.length === 0) throw new Error('Task not found');

  const t = task.rows[0];

  const completion = await ai.chat.completions.create({
    model: env.MINIMAX_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You help people with ADHD break down overwhelming tasks into small, concrete, actionable subtasks. Respond ONLY with a JSON array of strings. Each subtask should be specific, bite-sized, and achievable in one sitting (5-30 minutes). Return 3-7 subtasks.',
      },
      {
        role: 'user',
        content: `Break down this task into small subtasks: "${t.title}"`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  
  console.log(completion)
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  let subtasks: Subtask[];
  try {
    const parsed = JSON.parse(content);
    subtasks = (parsed.subtasks || parsed.tasks || parsed).map((s: string | { title: string }) =>
      typeof s === 'string' ? { title: s } : s
    );
  } catch {
    throw new Error('Failed to parse AI response');
  }

  for (const subtask of subtasks) {
    await pool.query(
      `INSERT INTO tasks (id, title, description, priority, due_date, category_id, parent_task_id, is_ai_generated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
      [uuid(), subtask.title, `AI-generated subtask of: ${t.title}`, t.priority, t.due_date, t.category_id, taskId]
    );
  }

  return subtasks;
}
