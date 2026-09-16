import { createHash } from "node:crypto";

export type Feedback = {
  source: string;
  feedback_id: string;
  user_id: string | null;
  message_text: string;
  timestamp: string;
  rating: number | null;
  category: string;
  sentiment: string;
  confidence_score: number | null;
  explanation: string | null;
  uncertain_classification: boolean;
  issue_type: string | null;
  issue_cat: string | null;
};
export type Filter = {
  from: string;
  to: string;
  source: string;
  category: string;
  issue: string;
  review: boolean;
  q: string;
  page: number;
};
export type IssueGroup = {
  key: string;
  name: string;
  category: string;
  messages: number;
  reporters: number;
  repeatedReporters: number;
  review: number;
};
export const sourceLabels: Record<string, string> = {
  app_submission: "Customer submission",
  app_store: "App Store",
  google_play: "Google Play",
  in_app: "In-app",
  support: "Support",
};
export const nice = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (x) => x.toUpperCase());
export const issueKey = (category: string, name: string) =>
  `issue-${createHash("sha256")
    .update(JSON.stringify([category, name]))
    .digest("hex")
    .slice(0, 24)}`;
export const needsReview = (row: Feedback) =>
  row.uncertain_classification ||
  row.confidence_score === null ||
  !row.explanation?.trim() ||
  row.confidence_score < 0.7;
export const reporterKey = (row: Feedback) =>
  row.user_id?.trim() ? JSON.stringify([row.source, row.user_id]) : null;
export const distinctReporters = (rows: Feedback[]) =>
  new Set(rows.map(reporterKey).filter(Boolean)).size;
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): Filter {
  const value = (name: string) =>
    typeof params[name] === "string" ? params[name] : "";
  const date = (name: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value(name)) ? value(name) : "";
  return {
    from: date("from"),
    to: date("to"),
    source: value("source"),
    category: value("category"),
    issue: value("issue"),
    review: value("review") === "1",
    q: value("q").slice(0, 200),
    page: Math.max(1, Math.floor(Number(value("page")) || 1)),
  };
}
export function filterRows(rows: Feedback[], f: Filter) {
  return rows.filter(
    (r) =>
      (!f.from || r.timestamp.slice(0, 10) >= f.from) &&
      (!f.to || r.timestamp.slice(0, 10) <= f.to) &&
      (!f.source || r.source === f.source) &&
      (!f.category || r.category === f.category) &&
      (!f.issue ||
        (r.issue_type &&
          issueKey(r.issue_cat ?? r.category, r.issue_type) === f.issue)) &&
      (!f.review || needsReview(r)) &&
      (!f.q ||
        `${r.message_text} ${r.explanation ?? ""} ${r.feedback_id}`
          .toLowerCase()
          .includes(f.q.toLowerCase())),
  );
}
export function groups(rows: Feedback[]): IssueGroup[] {
  const map = new Map<string, Feedback[]>();
  for (const row of rows) {
    if (!row.issue_type) continue;
    const key = issueKey(row.issue_cat ?? row.category, row.issue_type);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return [...map]
    .map(([key, entries]) => {
      const reporters = new Map<string, number>();
      for (const entry of entries) {
        const id = reporterKey(entry);
        if (id) reporters.set(id, (reporters.get(id) ?? 0) + 1);
      }
      return {
        key,
        name: entries[0].issue_type!,
        category: entries[0].issue_cat ?? entries[0].category,
        messages: entries.length,
        reporters: reporters.size,
        repeatedReporters: [...reporters.values()].filter((n) => n > 1).length,
        review: entries.filter(needsReview).length,
      };
    })
    .sort((a, b) => b.messages - a.messages || a.name.localeCompare(b.name));
}
export function filterUrl(
  f: Filter,
  changes: Partial<Filter> = {},
  anchor = "",
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...f, page: 1, ...changes })) {
    if (value && !(key === "page" && value === 1))
      query.set(key, typeof value === "boolean" ? "1" : String(value));
  }
  return `/?${query}${anchor}`;
}
