import Link from "next/link";
import type { Decision } from "@/lib/types";
import { ReloadDecision } from "./reload-decision";
export const decisionLabels = { approved: "Approved for action", rejected: "Not now", needs_info: "Needs more information" };
export function DecisionSummary({decision, issueKey, saved = false, showEdit = true}: {decision:Decision|null;issueKey:string;saved?:boolean;showEdit?:boolean}) {
  return <section id="saved-decision" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 scroll-mt-6" aria-label="Saved team decision">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">{decision ? "SAVED TEAM DECISION" : "TEAM DECISION"}</p><h2 className="mt-2">{decision ? "✓ Stored in Lakebase Postgres" : "No decision saved yet"}</h2></div>
      {showEdit && <Link className="primary-button" href={`/issues/${issueKey}#assignment`}>{decision ? "Edit owner & decision →" : "Assign owner & decide →"}</Link>}
    </div>
    {saved && decision && <p role="status" className="mt-3 text-sm text-emerald-300">Saved successfully. The values below were read back from Lakebase.</p>}
    {decision ? <>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div><dt className="text-xs text-muted">Owner</dt><dd className="mt-1 text-lg font-semibold">{decision.owner ?? "Unassigned"}</dd></div>
        <div><dt className="text-xs text-muted">Priority</dt><dd className="mt-1 text-lg font-semibold">{decision.priority ?? "Not set"}</dd></div>
        <div><dt className="text-xs text-muted">Status</dt><dd className="mt-1 font-semibold">{decisionLabels[decision.status]}</dd></div>
      </dl>
      {decision.note && <div className="mt-4"><p className="text-xs text-muted">Saved note</p><p className="mt-1 text-sm leading-7 whitespace-pre-wrap">{decision.note}</p></div>}
      <p className="mt-4 text-xs text-muted">Last saved: <time dateTime={decision.decided_at}>{new Date(decision.decided_at).toISOString().replace("T"," ").slice(0,19)} UTC</time></p>
      <div className="mt-4 flex flex-wrap items-center gap-4"><ReloadDecision /><Link href="/decisions" className="text-sm text-accent">View all saved decisions →</Link></div>
      <div className="mt-5 border-t border-emerald-500/20 pt-4 text-sm">
        <p className="font-semibold">Where this is saved</p>
        <p className="mt-2 text-muted">Lakebase Postgres · <code className="break-all">papaeats_app.issue_decisions</code></p>
        <p className="mt-2 leading-6 text-muted">Save writes this issue’s decision to the database. Reload reads it back. Processing new feedback keeps this owner and decision.</p>
        <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">Record reference</summary><p className="mt-2 break-all">{issueKey}</p></details>
      </div>
    </> : <p className="mt-3 text-sm text-muted">Choose an owner, priority and status, then save. Your decision will appear here and in Saved decisions.</p>}
  </section>;
}
