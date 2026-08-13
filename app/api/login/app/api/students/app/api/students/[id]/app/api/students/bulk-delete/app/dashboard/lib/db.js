import { Pool } from "pg";

// A single pooled connection reused across serverless invocations where possible.
// `global` caching avoids exhausting connections on Vercel's hot-reload / dev mode.
let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string in your environment variables."
    );
  }
  if (!global._crmPool) {
    global._crmPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  pool = global._crmPool;
  return pool;
}
