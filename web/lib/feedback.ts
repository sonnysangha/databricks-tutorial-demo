import "server-only";
import { warehouseRows } from "./databricks";
import { hasLakebase, lakebasePool } from "./lakebase";
import type { Feedback } from "./feedback-model";
export * from "./feedback-model";

const postgresFeedback = () => process.env.FEEDBACK_BACKEND === "postgres";
export const dataMode = () =>
  postgresFeedback() ? "Lakebase Postgres" : hasLakebase() ? "Databricks SQL + Lakebase" : "Databricks SQL";

function identifier(value: string, parts: number) {
  if (
    !new RegExp(
      `^[a-zA-Z_][a-zA-Z0-9_]*(\\.[a-zA-Z_][a-zA-Z0-9_]*){${parts - 1}}$`,
    ).test(value)
  )
    throw new Error("Invalid configured feedback table.");
  return value;
}
function parse(row: Record<string, unknown>): Feedback {
  for (const field of [
    "source",
    "feedback_id",
    "message_text",
    "timestamp",
    "category",
    "sentiment",
  ]) {
    if (row[field] == null)
      throw new Error(
        `Saved feedback is missing ${field}; run the workflow checks.`,
      );
  }
  const text = (field: string) =>
    row[field] == null ? null : String(row[field]);
  const number = (field: string) =>
    row[field] == null ||
    row[field] === "" ||
    !Number.isFinite(Number(row[field]))
      ? null
      : Number(row[field]);
  const rawDate =
    row.timestamp instanceof Date
      ? row.timestamp.toISOString()
      : String(row.timestamp);
  const timestamp = new Date(
    /[zZ]$|[+-]\d\d:\d\d$/.test(rawDate)
      ? rawDate
      : rawDate.replace(" ", "T") + "Z",
  ).toISOString();
  return {
    source: String(row.source),
    feedback_id: String(row.feedback_id),
    user_id: text("user_id"),
    message_text: String(row.message_text),
    timestamp,
    rating: number("rating"),
    category: String(row.category),
    sentiment: String(row.sentiment),
    confidence_score: number("confidence_score"),
    explanation: text("explanation"),
    uncertain_classification:
      row.uncertain_classification === true ||
      row.uncertain_classification === "true",
    issue_type: text("issue_type"),
    issue_cat: text("issue_cat"),
  };
}
let snapshot: { rows: Feedback[]; readAt: string; until: number } | undefined;
let inflight: Promise<NonNullable<typeof snapshot>> | undefined;
let revision = 0;
export function invalidateFeedbackSnapshot() { revision++; snapshot = undefined; inflight = undefined; }
export async function feedbackSnapshot() {
  if (snapshot && snapshot.until > Date.now()) return snapshot;
  if (inflight) return inflight;
  const readingRevision = revision;
  const reading = (async () => {
    const columns =
      "source, feedback_id, user_id, message_text, timestamp, rating, category, sentiment, confidence_score, explanation, uncertain_classification, issue_type, issue_cat";
    const table = postgresFeedback()
      ? identifier(
          process.env.FEEDBACK_TABLE ?? "papaeats.feedback_with_issue_type",
          2,
        )
      : identifier(
          process.env.DATABRICKS_FEEDBACK_TABLE ??
            "workspace.papaeats.feedback_with_issue_type",
          3,
        );
    const sql = `SELECT ${columns} FROM ${table} LIMIT 10001`;
    const raw = postgresFeedback()
      ? (await lakebasePool().query(sql)).rows
      : await warehouseRows(sql);
    if (raw.length > 10000)
      throw new Error(
        "This preview supports up to 10,000 messages. Add database-side aggregation before increasing the limit.",
      );
    const rows = raw.map(parse);
    if (
      new Set(rows.map((row) => JSON.stringify([row.source, row.feedback_id])))
        .size !== rows.length
    )
      throw new Error(
        "Duplicate feedback IDs found. Refresh stopped to avoid inflated totals.",
      );
    const freshSnapshot = {
      rows,
      readAt: new Date().toISOString(),
      until: Date.now() + 60000,
    };
    if (revision === readingRevision) snapshot = freshSnapshot;
    return freshSnapshot;
  })();
  inflight = reading;
  try {
    return await reading;
  } finally {
    if (inflight === reading) inflight = undefined;
  }
}
