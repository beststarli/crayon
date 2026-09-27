import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { databaseConfigured, getServerConfig } from "./env";

const globalDb = globalThis as typeof globalThis & { crayonPool?: Pool };

export function getPool() {
  if (!databaseConfigured()) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalDb.crayonPool) {
    globalDb.crayonPool = new Pool({ connectionString: getServerConfig().databaseUrl, max: 10 });
  }
  return globalDb.crayonPool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
