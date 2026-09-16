import "server-only";
import { feedbackSnapshot, groups, issueKey } from "./feedback";
import { hasLakebase, lakebasePool } from "./lakebase";
import type { Decision } from "./types";
export const decisionsEnabled = () =>
  hasLakebase() && process.env.ENABLE_DECISIONS === "true";
function normalizeDecision(row: Decision): Decision {
  return {...row, decided_at: new Date(row.decided_at).toISOString()};
}
export async function getDecision(key: string): Promise<Decision | null> {
  if (!decisionsEnabled()) return null;
  const row = (await lakebasePool().query("SELECT * FROM papaeats_app.issue_decisions WHERE issue_key=$1", [key])).rows[0];
  return row ? normalizeDecision(row) : null;
}
export async function savedDecisions() {
  if (!decisionsEnabled()) return [];
  const rows = (await lakebasePool().query("SELECT * FROM papaeats_app.issue_decisions ORDER BY decided_at DESC")).rows;
  const snapshot = await feedbackSnapshot();
  const names = new Map(groups(snapshot.rows).map(g => [g.key, g.name]));
  return rows.map(row => ({...normalizeDecision(row), issueName: names.get(row.issue_key) ?? "Saved issue"}));
}
export async function getIssue(key: string) {
  const { rows } = await feedbackSnapshot();
  const issue = groups(rows).find((group) => group.key === key);
  if (!issue) return null;
  const evidence = rows
    .filter(
      (row) =>
        row.issue_type &&
        issueKey(row.issue_cat ?? row.category, row.issue_type) === key,
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const decision = await getDecision(key);
  return { issue, evidence, decision };
}
export async function saveDecision(d: Omit<Decision, "decided_at">) {
  if (!decisionsEnabled())
    throw new Error("Decision storage is not connected yet.");
  if (!(await getIssue(d.issue_key))) throw new Error("Issue not found.");
  await lakebasePool().query(
    `INSERT INTO papaeats_app.issue_decisions (issue_key,status,priority,owner,note) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (issue_key) DO UPDATE SET status=EXCLUDED.status, priority=EXCLUDED.priority, owner=EXCLUDED.owner, note=EXCLUDED.note, decided_at=now()`,
    [d.issue_key, d.status, d.priority, d.owner, d.note],
  );
}
