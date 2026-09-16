import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
let token: { value: string; until: number } | undefined;

function host() {
  const value = process.env.DATABRICKS_HOST;
  if (!value || !/^https:\/\/[^/]+\/?$/.test(value))
    throw new Error("Set DATABRICKS_HOST to your workspace HTTPS URL.");
  return value.replace(/\/$/, "");
}

// Local development uses the user's existing CLI login. Deployed Apps use their
// injected service principal. Neither credential is sent to the browser.
export async function workspaceToken(): Promise<string> {
  if (token && token.until > Date.now()) return token.value;
  let value: string;
  if (
    process.env.DATABRICKS_CLIENT_ID &&
    process.env.DATABRICKS_CLIENT_SECRET
  ) {
    const response = await fetch(`${host()}/oidc/v1/token`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.DATABRICKS_CLIENT_ID}:${process.env.DATABRICKS_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=all-apis",
    });
    if (!response.ok)
      throw new Error(`Workspace authentication failed (${response.status}).`);
    const result = await response.json();
    value = result.access_token;
  } else if (
    !process.env.DATABRICKS_APP_NAME &&
    process.env.DATABRICKS_PROFILE
  ) {
    try {
      const { stdout } = await exec(
        "databricks",
        [
          "auth",
          "token",
          process.env.DATABRICKS_PROFILE,
          "--timeout",
          "15s",
          "-o",
          "json",
        ],
        { timeout: 20000, maxBuffer: 65536 },
      );
      value = JSON.parse(stdout).access_token;
    } catch {
      throw new Error(
        "Local Databricks login unavailable. Run databricks auth login for your configured profile.",
      );
    }
  } else throw new Error("Databricks authentication is not configured.");
  if (typeof value !== "string" || !value)
    throw new Error("Workspace authentication returned no token.");
  token = { value, until: Date.now() + 5 * 60 * 1000 };
  return value;
}

type Result = {
  statement_id: string;
  status: { state: string };
  manifest?: { truncated?: boolean; schema: { columns: { name: string }[] } };
  result?: {
    data_array?: (string | null)[][];
    next_chunk_internal_link?: string;
  };
};

export async function warehouseRows(
  statement: string,
): Promise<Record<string, unknown>[]> {
  const bearer = await workspaceToken();
  const headers = {
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
  };
  const request = async (path: string, body?: object) => {
    const response = await fetch(`${host()}${path}`, {
      method: body ? "POST" : "GET",
      headers,
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(55000),
    });
    if (!response.ok)
      throw new Error(`Databricks query request failed (${response.status}).`);
    return response.json();
  };
  if (!process.env.DATABRICKS_WAREHOUSE_ID)
    throw new Error("Set DATABRICKS_WAREHOUSE_ID.");
  let result: Result = await request("/api/2.0/sql/statements", {
    warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
    statement,
    wait_timeout: "50s",
    on_wait_timeout: "CANCEL",
    disposition: "INLINE",
    format: "JSON_ARRAY",
  });
  if (result.status.state !== "SUCCEEDED")
    throw new Error(
      `Data query ${result.status.state.toLowerCase()}. Refresh to retry.`,
    );
  if (result.manifest?.truncated)
    throw new Error(
      "Query result exceeded the response limit; no partial totals are displayed.",
    );
  const columns = result.manifest?.schema.columns;
  if (!columns) throw new Error("Data query returned no schema.");
  const values = [...(result.result?.data_array ?? [])];
  while (result.result?.next_chunk_internal_link) {
    const path = result.result.next_chunk_internal_link;
    if (
      !path.startsWith(
        `/api/2.0/sql/statements/${result.statement_id}/result/chunks/`,
      )
    )
      throw new Error("Unexpected result chunk path.");
    result = { ...result, result: await request(path) };
    values.push(...(result.result?.data_array ?? []));
  }
  return values.map((row) =>
    Object.fromEntries(
      columns.map((column, index) => [column.name, row[index]]),
    ),
  );
}

/** Server-only Jobs API. Inputs never contain customer text or credentials. */
export async function workspaceRequest<T>(path: string, body?: object): Promise<T> {
  if (!/^\/api\/2\.2\/jobs\/(run-now|runs\/get)(\?|$)/.test(path))
    throw new Error("Unsupported job request.");
  const response = await fetch(`${host()}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${await workspaceToken()}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Job request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
