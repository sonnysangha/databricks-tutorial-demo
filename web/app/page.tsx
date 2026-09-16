import Link from "next/link";
import {
  feedbackSnapshot,
  filterRows,
  parseFilters,
  groups,
  distinctReporters,
  needsReview,
  sourceLabels,
  nice,
  filterUrl,
} from "@/lib/feedback";
import { IssueChart, MessageList, SentimentChart } from "./feedback-ui";
import { Stat } from "./ui";
import { getDecision, decisionsEnabled } from "@/lib/issues";
import { DecisionSummary } from "./decision-summary";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: PageProps<"/">) {
  const f = parseFilters(await searchParams);
  const snapshot = await feedbackSnapshot();
  const rows = filterRows(snapshot.rows, f);
  const issues = groups(rows);
  const selected = groups(snapshot.rows).find((g) => g.key === f.issue);
  const decision = selected ? await getDecision(selected.key) : null;
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const page = Math.min(f.page, pages);
  const messages = [...rows]
    .sort(
      (a, b) =>
        b.timestamp.localeCompare(a.timestamp) ||
        a.source.localeCompare(b.source) ||
        a.feedback_id.localeCompare(b.feedback_id),
    )
    .slice((page - 1) * 25, page * 25);
  const dates = snapshot.rows.map((r) => r.timestamp.slice(0, 10)).sort();
  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">CUSTOMER INTELLIGENCE / OVERVIEW</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Listen. Understand. <span className="text-accent">Act.</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            Every issue, with the customer feedback behind it.
          </p>
        </div>
        <div className="text-xs leading-6 text-muted">
          Saved PapaEats analysis
          <br />
          Read at{" "}
          {new Date(snapshot.readAt).toLocaleTimeString("en-GB", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          UTC · cached for 60 seconds
        </div>
      </section>
      <form className="filter-panel" action="/" key={JSON.stringify(f)}>
        <label>
          From
          <input
            type="date"
            name="from"
            defaultValue={f.from}
            min={dates[0]}
            max={dates.at(-1)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            name="to"
            defaultValue={f.to}
            min={dates[0]}
            max={dates.at(-1)}
          />
        </label>
        <label>
          Source
          <select name="source" defaultValue={f.source}>
            <option value="">All sources</option>
            {Object.entries(sourceLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select name="category" defaultValue={f.category}>
            <option value="">All categories</option>
            {[...new Set(snapshot.rows.map((r) => r.category))]
              .sort()
              .map((c) => (
                <option key={c} value={c}>
                  {nice(c)}
                </option>
              ))}
          </select>
        </label>
        <label className="grow">
          Search feedback
          <input
            name="q"
            placeholder="Search messages or explanations…"
            defaultValue={f.q}
          />
        </label>
        {f.issue && <input type="hidden" name="issue" value={f.issue} />}
        <label className="review-toggle">
          <input
            type="checkbox"
            name="review"
            value="1"
            defaultChecked={f.review}
          />
          Needs review
        </label>
        <button className="primary-button">Apply filters</button>
        <Link href="/" className="text-xs text-muted underline">
          Reset
        </Link>
      </form>
      {f.from && f.to && f.from > f.to && (
        <p role="alert" className="notice">
          The start date is after the end date. Choose a valid date range.
        </p>
      )}
      {f.issue && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
          <span>
            Viewing: <strong>{selected?.name ?? "Unknown issue"}</strong>
          </span>
          <Link
            href={filterUrl(f, { issue: "" })}
            className="ml-auto underline"
          >
            Clear issue ×
          </Link>
          {selected && (
            <Link className="primary-button" href={`/issues/${selected.key}`}>
              Open issue →
            </Link>
          )}
        </div>
      )}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Feedback messages"
          value={rows.length.toLocaleString()}
          hint={`${f.from || dates[0] || "—"} → ${f.to || dates.at(-1) || "—"} · UTC`}
        />
        <Stat
          label="Distinct source user IDs"
          value={distinctReporters(rows).toLocaleString()}
          hint="Counted once per source in this selection"
        />
        <Stat
          label="Actionable issue types"
          value={issues.length}
          hint={`${rows.filter((r) => r.issue_type).length} bug, complaint and request messages`}
        />
        <Stat
          label="Messages needing review"
          value={
            <Link
              href={filterUrl(f, { review: true })}
              className="text-amber-300 hover:underline"
            >
              {rows.filter(needsReview).length}
            </Link>
          }
          hint="Low scores, flagged or incomplete analysis"
        />
      </section>
      <p className="text-xs text-muted">
        All metrics use the current filters. Matching usernames on different
        sources are counted separately; these are identifiers, not verified
        unique people.
      </p>
      <section className="grid items-start gap-5 lg:grid-cols-2">
        <IssueChart
          title="Biggest recurring problems"
          subtitle="Bugs and complaints · ranked by message count"
          issues={issues.filter((i) => i.category !== "FEATURE_REQUEST")}
          filters={f}
        />
        <IssueChart
          title="Most requested features"
          subtitle="Requests for new capabilities · questions kept separate"
          issues={issues.filter((i) => i.category === "FEATURE_REQUEST")}
          filters={f}
          features
        />
      </section>
      <section className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <SentimentChart rows={rows} />
        <div className="panel p-5">
          <h2>Feedback by category</h2>
          <p className="panel-hint">
            Select a category to inspect its messages.
          </p>
          <div className="mt-5 space-y-3">
            {[...new Set(rows.map((r) => r.category))]
              .map(
                (c) =>
                  [c, rows.filter((r) => r.category === c).length] as const,
              )
              .sort((a, b) => b[1] - a[1])
              .map(([c, n]) => (
                <Link
                  key={c}
                  href={filterUrl(f, { category: c })}
                  className="flex justify-between gap-3 text-sm hover:text-accent"
                >
                  <span>{nice(c)}</span>
                  <span className="font-mono text-muted">{n}</span>
                </Link>
              ))}
            {!rows.length && (
              <p className="panel-hint">No matching categories.</p>
            )}
          </div>
        </div>
      </section>
      <section id="messages" className="panel scroll-mt-6">
        {selected && decisionsEnabled() && (
          <div className="p-5 border-b border-border">
            <DecisionSummary decision={decision} issueKey={selected.key} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2>{selected?.name ?? "Customer feedback"}</h2>
            <p className="panel-hint">
              {rows.length.toLocaleString()} matching messages · original
              cleaned text and saved AI explanations
            </p>
          </div>
          <span className="text-xs text-muted">
            AI-generated labels · review before acting
          </span>
        </div>
        <MessageList rows={messages} />
        <nav
          aria-label="Feedback pagination"
          className="flex items-center justify-between border-t border-border p-5 text-sm"
        >
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <div className="flex gap-4">
            {page > 1 && (
              <Link href={filterUrl(f, { page: page - 1 }, "#messages")}>
                ← Previous
              </Link>
            )}
            {page < pages && (
              <Link href={filterUrl(f, { page: page + 1 }, "#messages")}>
                Next →
              </Link>
            )}
          </div>
        </nav>
      </section>
    </div>
  );
}
