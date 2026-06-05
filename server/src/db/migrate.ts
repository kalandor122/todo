import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from '../config/env';

async function migrate() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  await client.query(sql);

  console.log('Migration completed successfully');
  await client.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
