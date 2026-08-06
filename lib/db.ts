import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "@/db/schema";

/**
 * Neon HTTP + Drizzle client.
 * Safe for serverless / Next.js route handlers.
 */
function createDb() {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export type Database = typeof db;
