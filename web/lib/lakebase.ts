import "server-only";
import { Pool } from "pg";
import { workspaceToken } from "./databricks";

/** Lakebase Postgres: server-only OAuth credentials refresh before expiry.
 * Local development uses the configured CLI login. Databricks Apps uses its SP.
 * PG* and LAKEBASE_ENDPOINT are explicit configuration; never sent to a browser.
 */

const TOKEN_TTL_MS = 55 * 60 * 1000; // tokens last 60 minutes; refresh a little early

let cached: { token: string; expiresAt: number } | null = null;

function host(): string {
  const h = process.env.DATABRICKS_HOST ?? "";
  return h.startsWith("http") ? h.replace(/\/$/, "") : `https://${h}`;
}

export async function lakebasePassword(): Promise<string> {
  if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const endpoint = process.env.LAKEBASE_ENDPOINT;
  if (!endpoint)
    throw new Error(
      "LAKEBASE_ENDPOINT is not set (app.yaml: valueFrom: postgres)",
    );

  const bearer = await workspaceToken();
  const res = await fetch(`${host()}/api/2.0/postgres/credentials`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok)
    throw new Error(`Lakebase credential request failed (${res.status}).`);
  const json = (await res.json()) as { token: string };
  cached = { token: json.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return json.token;
}

let pool: Pool | null = null;

export function lakebasePool(): Pool {
  if (pool) return pool;
  pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    // pg calls this for every new connection, so refreshed tokens are picked up automatically
    password: lakebasePassword,
    // Lakebase endpoints present certificates from a public CA, so verification stays on.
    ssl:
      process.env.PGSSLMODE === "disable"
        ? undefined
        : { rejectUnauthorized: true },
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
  });
  return pool;
}

export const hasLakebase = () => Boolean(process.env.PGHOST);
