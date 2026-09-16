import Link from "next/link";
import {
  type Feedback,
  type Filter,
  type IssueGroup,
  filterUrl,
  needsReview,
  sourceLabels,
  nice,
} from "@/lib/feedback";
export function IssueChart({
  title,
  subtitle,
  issues,
  filters,
  features,
}: {
  title: string;
  subtitle: string;
  issues: IssueGroup[];
  filters: Filter;
  features?: boolean;
}) {
  const max = Math.max(1, ...issues.map((i) => i.messages));
  return (
    <div className="panel p-5">
      <div className="flex justify-between gap-3">
        <h2>{title}</h2>
        <span className="text-xs text-muted">{issues.length} types</span>
      </div>
      <p className="panel-hint">{subtitle}</p>
      <div className="mt-5 space-y-4">
        {issues.slice(0, 8).map((i) => (
          <Link
            key={i.key}
            href={filterUrl(filters, { issue: i.key }, "#messages")}
            className="group block"
            aria-label={`${i.name}: ${i.messages} messages, ${i.reporters} source user IDs`}
          >
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="group-hover:text-accent">{i.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {i.messages} msgs / {i.reporters} IDs
              </span>
            </div>
            <div className="h-2 rounded-sm bg-surface-2">
              <div
                className={`h-full rounded-sm ${features ? "bg-sky-400/80" : "bg-accent/80"} group-hover:brightness-125`}
                style={{ width: `${(i.messages / max) * 100}%` }}
              />
            </div>
          </Link>
        ))}
        {!issues.length && (
          <p className="empty-state">
            No issues match these filters. <Link href="/">Reset filters</Link>
          </p>
        )}
      </div>
      {issues.length > 8 && (
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-muted">
            Show all {issues.length} issue types
          </summary>
          <div className="mt-3 space-y-3">
            {issues.slice(8).map((i) => (
              <Link
                key={i.key}
                href={filterUrl(filters, { issue: i.key }, "#messages")}
                className="flex justify-between hover:text-accent"
              >
                <span>{i.name}</span>
                <span>
                  {i.messages} msgs / {i.reporters} IDs
                </span>
              </Link>
            ))}
          </div>
        </details>
      )}
      <p className="mt-5 text-xs text-muted">
        Click an issue to see every matching message.
      </p>
    </div>
  );
}
const sentiments = ["positive", "negative", "neutral", "mixed"];
const colors: Record<string, string> = {
  positive: "bg-emerald-400",
  negative: "bg-rose-400",
  neutral: "bg-slate-400",
  mixed: "bg-amber-400",
};
export function SentimentChart({ rows }: { rows: Feedback[] }) {
  const weeks = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const d = new Date(row.timestamp);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    const w =
      weeks.get(key) ?? Object.fromEntries(sentiments.map((s) => [s, 0]));
    if (sentiments.includes(row.sentiment)) w[row.sentiment]++;
    weeks.set(key, w);
  }
  // Keep empty weeks so equal widths always represent equal time spans.
  const bounds = [...weeks.keys()].sort();
  if (bounds.length) {
    const cursor = new Date(bounds[0] + "T00:00:00Z");
    const end = bounds[bounds.length - 1];
    while (cursor.toISOString().slice(0, 10) <= end) {
      const week = cursor.toISOString().slice(0, 10);
      if (!weeks.has(week))
        weeks.set(week, Object.fromEntries(sentiments.map((s) => [s, 0])));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  }
  const ordered = [...weeks].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(
    1,
    ...ordered.map(([, c]) => Object.values(c).reduce((a, b) => a + b, 0)),
  );
  return (
    <div className="panel p-5">
      <h2>How sentiment changes</h2>
      <p className="panel-hint">Messages per week · weeks start Monday · UTC</p>
      <div className="mt-5 flex flex-wrap gap-4 text-xs">
        {sentiments.map((s) => (
          <span key={s} className="flex items-center gap-2">
            <i className={`h-2 w-2 rounded-full ${colors[s]}`} />
            {nice(s)}{" "}
            <span className="text-muted">
              {rows.filter((r) => r.sentiment === s).length}
            </span>
          </span>
        ))}
      </div>
      {ordered.length ? (
        <div className="mt-5 overflow-x-auto">
          <div
            className="flex h-48 min-w-96 items-end gap-2 border-b border-border pt-5"
            role="img"
            aria-label="Weekly sentiment message counts; exact values in table below"
          >
            {ordered.map(([week, c]) => (
              <div
                key={week}
                className="flex h-full min-w-3 flex-1 flex-col justify-end"
                title={`${week}: ${Object.entries(c)
                  .map(([s, n]) => `${n} ${s}`)
                  .join(", ")}`}
              >
                {sentiments.map((s) => (
                  <div
                    key={s}
                    className={`${colors[s]} opacity-80`}
                    style={{ height: `${(c[s] / max) * 100}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{ordered[0][0]}</span>
            <span>{ordered.at(-1)?.[0]}</span>
          </div>
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer">View weekly counts</summary>
            <table className="mt-3 w-full text-left">
              <caption className="sr-only">Weekly sentiment counts</caption>
              <thead>
                <tr>
                  <th>Week</th>
                  {sentiments.map((s) => (
                    <th key={s}>{nice(s)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordered.map(([w, c]) => (
                  <tr key={w}>
                    <td>{w}</td>
                    {sentiments.map((s) => (
                      <td key={s}>{c[s]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      ) : (
        <p className="empty-state">No matching feedback.</p>
      )}
    </div>
  );
}
export function MessageList({ rows }: { rows: Feedback[] }) {
  if (!rows.length)
    return (
      <div className="empty-state">
        No messages match. <Link href="/">Clear the filters</Link> to explore
        all feedback.
      </div>
    );
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={JSON.stringify([r.source, r.feedback_id])} className="p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            <span className="source-badge">
              {sourceLabels[r.source] ?? r.source}
            </span>
            <span>{r.user_id ?? "Unknown user"}</span>
            <time dateTime={r.timestamp}>{r.timestamp.slice(0, 10)}</time>
            <span className="ml-auto">{nice(r.sentiment)}</span>
            <span>
              AI score:{" "}
              {r.confidence_score === null
                ? "Unavailable"
                : r.confidence_score.toFixed(2)}
            </span>
            {needsReview(r) && (
              <span className="review-badge">Needs review</span>
            )}
          </div>
          <p className="mt-3 break-words text-sm leading-7">{r.message_text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="source-badge">{nice(r.category)}</span>
            {r.issue_type && (
              <span className="source-badge">{r.issue_type}</span>
            )}
          </div>
          <p className="mt-3 text-xs leading-6 text-muted">
            <span className="font-medium text-foreground/70">
              Category explanation:{" "}
            </span>
            {r.explanation ||
              "Missing from the saved analysis. Review this message."}
          </p>
        </li>
      ))}
    </ul>
  );
}
