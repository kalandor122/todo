import { env } from '../config/env';
import { pool } from '../db/pool';

let client: any = null;

export function startMqttBridge() {
  if (!env.MQTT_HOST) {
    console.log('[MQTT] No host configured, skipping');
    return;
  }

  try {
    const mqtt = require('mqtt');
    const url = `mqtt://${env.MQTT_HOST}:${env.MQTT_PORT}`;
    const options: Record<string, any> = { connectTimeout: 5000, reconnectPeriod: 30000 };
    if (env.MQTT_USERNAME) options.username = env.MQTT_USERNAME;
    if (env.MQTT_PASSWORD) options.password = env.MQTT_PASSWORD;

    client = mqtt.connect(url, options);

    client.on('connect', () => {
      console.log('[MQTT] Connected to broker');

      const deviceId = env.HA_TODO_DEVICE_ID;
      const discoveryTopic = `homeassistant/todo/${deviceId}/config`;
      const commandTopic = `homeassistant/todo/${deviceId}/command`;

      const discoveryPayload = {
        name: 'Todo App',
        unique_id: deviceId,
        command_topic: commandTopic,
        state_topic: `homeassistant/todo/${deviceId}/state`,
        availability: { topic: `homeassistant/todo/${deviceId}/availability` },
      };

      client.publish(discoveryTopic, JSON.stringify(discoveryPayload), { retain: true });
      client.subscribe(commandTopic);
      client.publish(`homeassistant/todo/${deviceId}/availability`, 'online', { retain: true });
    });

    client.on('message', async (topic: string, message: Buffer) => {
      try {
        const payload = JSON.parse(message.toString());
        const deviceId = env.HA_TODO_DEVICE_ID;

        if (payload.action === 'add' && payload.item?.summary) {
          await pool.query('INSERT INTO tasks (title) VALUES ($1)', [payload.item.summary]);
          publishState(deviceId);
        } else if (payload.action === 'update' && payload.uid) {
          if (payload.item?.summary) {
            await pool.query('UPDATE tasks SET title = $1 WHERE id = $2', [payload.item.summary, payload.uid]);
          }
          publishState(deviceId);
        } else if (payload.action === 'remove' && payload.uid) {
          await pool.query('DELETE FROM tasks WHERE id = $1', [payload.uid]);
          publishState(deviceId);
        }
      } catch (err) {
        console.error('[MQTT] Error handling message:', err);
      }
    });

    client.on('error', (err: Error) => {
      console.error('[MQTT] Connection error (non-fatal):', err.message);
    });

    client.on('close', () => {
      console.log('[MQTT] Disconnected (will auto-reconnect)');
    });
  } catch (err: any) {
    console.error('[MQTT] Failed to initialize (non-fatal):', err?.message);
    client = null;
  }
}

async function publishState(deviceId: string) {
  if (!client) return;
  try {
    const result = await pool.query(
      `SELECT id, title, status FROM tasks WHERE status = 'pending' ORDER BY created_at DESC`
    );
    const items = result.rows.map((r: any) => ({
      summary: r.title,
      uid: r.id,
      status: r.status === 'completed' ? 'completed' : 'needs_action',
    }));
    client.publish(`homeassistant/todo/${deviceId}/state`, JSON.stringify({ items }));
  } catch (err) {
    console.error('[MQTT] Error publishing state:', err);
  }
}

export function publishTaskUpdate(taskId: string, title: string, status: string) {
  if (!client) return;
  const deviceId = env.HA_TODO_DEVICE_ID;
  const s = status === 'completed' ? 'completed' : 'needs_action';
  client.publish(`homeassistant/todo/${deviceId}/state`, JSON.stringify({
    items: [{ summary: title, uid: taskId, status: s }],
  }));
}
