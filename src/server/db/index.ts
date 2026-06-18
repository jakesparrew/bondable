/**
 * Neon + Drizzle database client (HTTP driver).
 *
 * Use this `db` for the common serverless case: one-shot queries from Vercel
 * functions. The neon-http driver opens a stateless HTTP connection per query,
 * which is ideal for Vercel's short-lived function invocations and needs no
 * connection pooling.
 *
 * IMPORTANT — transactions / pooled work:
 *   The neon-http driver here does NOT support multi-statement transactions or
 *   session-level state. For anything that needs `db.transaction(...)`,
 *   interactive transactions, LISTEN/NOTIFY, or a long-lived pooled connection,
 *   use the neon-serverless `Pool` variant instead, e.g.:
 *
 *     import { Pool } from '@neondatabase/serverless';
 *     import { drizzle } from 'drizzle-orm/neon-serverless';
 *     import * as schema from './schema';
 *     const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
 *     export const dbPool = drizzle(pool, { schema });
 *
 *   (In edge/serverless runtimes you may also need to set
 *    `neonConfig.webSocketConstructor` for the Pool variant.)
 *
 * DATABASE_URL is loaded from the environment (.env.local locally, Vercel
 * project env vars in deployment). Never hard-code the connection string.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local (Neon connection string).');
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export { schema };
