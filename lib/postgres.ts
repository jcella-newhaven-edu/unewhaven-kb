import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Reuse the pool across module reloads during development.
const globalForPostgres = globalThis as typeof globalThis & { knowledgeBasePool?: Pool };

function getPool(): Pool {
  if (globalForPostgres.knowledgeBasePool) return globalForPostgres.knowledgeBasePool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Add it to .env.local.");

  const pool = new Pool({
    connectionString,
    application_name: "unewhaven-kb",
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });
  pool.on("error", (error) => console.error("PostgreSQL idle connection error:", error.message));
  globalForPostgres.knowledgeBasePool = pool;
  return pool;
}

export async function queryRows<Row extends QueryResultRow>(sql: string, values: unknown[] = []): Promise<Row[]> {
  const { rows } = await getPool().query<Row>(sql, values);
  return rows;
}

export async function withTransaction<Result>(run: (client: PoolClient) => Promise<Result>): Promise<Result> {
  const client = await getPool().connect();
  let discard = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}
