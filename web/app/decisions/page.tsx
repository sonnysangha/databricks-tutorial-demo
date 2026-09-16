import Link from "next/link";
import { savedDecisions, decisionsEnabled } from "@/lib/issues";
import { requireAppAccess } from "@/lib/app-access";
import { decisionLabels } from "../decision-summary";
import { ReloadDecision } from "../reload-decision";
export const dynamic = "force-dynamic";
export default async function DecisionsPage() {
  await requireAppAccess();
  const decisions=await savedDecisions();
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between items-end gap-4"><div><p className="eyebrow">TEAM ACTIONS</p><h1 className="mt-3 text-3xl font-semibold">Saved decisions</h1><p className="mt-3 text-sm text-muted">Owners, priorities and decisions read from Lakebase Postgres. These records stay saved when you leave the app.</p></div><ReloadDecision/></div>
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5"><p className="font-semibold">{decisionsEnabled() ? `✓ ${decisions.length} saved decision${decisions.length===1 ? "" : "s"} loaded from the database` : "Decision storage is not connected"}</p><p className="mt-2 text-sm text-muted">Open an issue to edit its owner or decision. Reload this page to read the stored values again.</p><p className="mt-2 text-xs text-muted">Storage: Lakebase Postgres · papaeats_app.issue_decisions</p></div>
    {decisions.length ? <div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Team decisions stored in Lakebase</caption><thead className="border-b border-border text-xs text-muted"><tr>{["Issue","Owner","Priority","Status","Last saved (UTC)"].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{decisions.map(d=><tr key={d.issue_key} className="border-b border-border last:border-0"><td className="p-4"><Link className="font-semibold text-accent" href={`/issues/${d.issue_key}#saved-decision`}>{d.issueName} →</Link>{d.note && <p className="mt-2 max-w-md text-xs leading-6 text-muted">{d.note}</p>}</td><td className="p-4">{d.owner ?? "Unassigned"}</td><td className="p-4">{d.priority ?? "Not set"}</td><td className="p-4">{decisionLabels[d.status]}</td><td className="p-4 whitespace-nowrap"><time dateTime={d.decided_at}>{d.decided_at.replace("T"," ").slice(0,19)}</time></td></tr>)}</tbody></table></div> : <div className="panel p-8"><h2>No saved team decisions yet</h2><p className="panel-hint">Select a recurring issue in the overview, then choose Assign owner & decide.</p></div>}
    <Link href="/" className="text-sm text-accent">← Back to feedback overview</Link>
  </div>;
}
