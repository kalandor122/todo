import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../.env' });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  MINIMAX_API_KEY: z.string().default(''),
  MINIMAX_MODEL: z.string().default('minimax/minimax-m2.5:free'),
  AI_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default(''),
  MQTT_HOST: z.string().default(''),
  MQTT_PORT: z.coerce.number().default(1883),
  MQTT_USERNAME: z.string().default(''),
  MQTT_PASSWORD: z.string().default(''),
  HA_TODO_DEVICE_ID: z.string().default('todo_app'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
