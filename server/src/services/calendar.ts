import { google } from 'googleapis';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleCallback(code: string): Promise<void> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  const setting = await pool.query('SELECT value FROM settings WHERE key = \'google_tokens\'');
  const existing = setting.rows[0]?.value || {};
  const updated = { ...existing, ...tokens };

  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('google_tokens', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [JSON.stringify(updated)]
  );
}

export async function syncTaskToCalendar(taskId: string): Promise<void> {
  const setting = await pool.query('SELECT value FROM settings WHERE key = \'google_tokens\'');
  if (setting.rows.length === 0) return;

  const tokens = setting.rows[0].value;
  if (!tokens?.access_token) return;

  const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
  if (task.rows.length === 0) return;

  const t = task.rows[0];
  if (!t.due_date) return;

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2 });

  const event = {
    summary: t.title,
    description: t.description || '',
    start: { date: t.due_date },
    end: { date: t.due_date },
    colorId: t.status === 'completed' ? '2' : '1',
  };

  try {
    const existing = await pool.query(
      'SELECT value FROM settings WHERE key = \'calendar_event_ids\''
    );
    const eventIds = existing.rows[0]?.value || {};
    const existingEventId = eventIds[taskId];

    if (existingEventId && t.status === 'completed') {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: existingEventId,
      });
      delete eventIds[taskId];
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ('calendar_event_ids', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [JSON.stringify(eventIds)]
      );
    } else if (existingEventId) {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: existingEventId,
        requestBody: event,
      });
    } else if (t.status !== 'completed') {
      const created = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      eventIds[taskId] = created.data.id;
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ('calendar_event_ids', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [JSON.stringify(eventIds)]
      );
    }
  } catch (err) {
    console.error('Calendar sync error:', err);
  }
}
