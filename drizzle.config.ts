import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config for the Neon (PostgreSQL) data foundation.
 *
 * ADDITIVE: this config governs ONLY the new src/server/db/schema.ts. It does
 * not interact with the existing Supabase migrations under supabase/migrations.
 *
 * DATABASE_URL must point at the Neon connection string and is loaded from
 * .env.local (do NOT commit it). Example:
 *   DATABASE_URL=postgresql://<user>:<password>@<host>.neon.tech/<db>?sslmode=require
 *
 * Usage:
 *   npx drizzle-kit generate   # diff schema -> SQL migration files in ./drizzle
 *   npx drizzle-kit push       # push the schema directly to Neon (dev)
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Surface every change in the generated SQL for review before pushing.
  verbose: true,
  strict: true,
});
