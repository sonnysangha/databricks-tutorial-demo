import Link from "next/link";
import { notFound } from "next/navigation";
import { getIssue, decisionsEnabled } from "@/lib/issues";
import { DecisionSummary } from "@/app/decision-summary";
import { DecisionForm } from "@/app/decision-form";
import { Stat } from "@/app/ui";
import { MessageList } from "@/app/feedback-ui";
import { nice } from "@/lib/feedback";
export const dynamic = "force-dynamic";
export default async function IssuePage(props: PageProps<"/issues/[key]">) {
  const { key } = await props.params;
  const p = await props.searchParams;
  const data = await getIssue(key);
  if (!data) notFound();
  const { issue, evidence, decision } = data;
  const page = Math.min(
    Math.max(1, Math.floor(Number(p.page) || 1)),
    Math.max(1, Math.ceil(evidence.length / 25)),
  );
  const enabled = decisionsEnabled();
  return (
    <div className="space-y-6">
      <Link href={`/?issue=${key}#messages`} className="text-sm text-muted">
        ← Back to filtered overview
      </Link>
      <div>
        <p className="eyebrow">{nice(issue.category)}</p>
        <h1 className="mt-3 text-3xl font-semibold">{issue.name}</h1>
        <p className="mt-3 text-sm text-muted">
          All saved feedback for this issue. Review the evidence before deciding
          what to do.
        </p>
      </div>
      {enabled && <DecisionSummary decision={decision} issueKey={key} saved={Boolean(p.saved)} showEdit={false}/>}
      <nav aria-label="Decision steps" className="flex flex-wrap gap-3 text-sm text-accent">
        <a href="#evidence">1. Review evidence →</a>
        <a href="#assignment">2. Assign & save →</a>
        {enabled && <a href="#saved-decision">3. See saved record & reload</a>}
      </nav>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Messages" value={issue.messages} />
        <Stat
          label="Source user IDs"
          value={issue.reporters}
          hint="Not cross-source verified people"
        />
        <Stat
          label="Repeat reporters"
          value={issue.repeatedReporters}
          hint="IDs with more than one message"
        />
        <Stat label="Need review" value={issue.review} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <section id="evidence" className="panel scroll-mt-6">
          <div className="border-b border-border p-5">
            <h2>1. Customer evidence</h2>
          </div>
          <MessageList rows={evidence.slice((page - 1) * 25, page * 25)} />
          <nav
            className="flex justify-between p-5 text-sm"
            aria-label="Issue evidence pagination"
          >
            <span>
              Page {page} of {Math.ceil(evidence.length / 25)}
            </span>
            <div className="flex gap-4">
              {page > 1 && <Link href={`?page=${page - 1}`}>← Previous</Link>}
              {page * 25 < evidence.length && (
                <Link href={`?page=${page + 1}`}>Next →</Link>
              )}
            </div>
          </nav>
        </section>
        <section id="assignment" className="panel p-5 scroll-mt-6 order-first lg:order-last lg:sticky lg:top-5">
          <p className="eyebrow">2. ASSIGN & SAVE</p>
          <h2 className="mt-2">Owner & team decision</h2>
          <p className="panel-hint">Choose who owns this issue and what should happen next.</p>
          {!enabled && <p className="notice mt-4">Connect Lakebase to save team decisions.</p>}
          <DecisionForm issueKey={key} decision={decision} enabled={enabled}/>
        </section>
      </div>
    </div>
  );
}
