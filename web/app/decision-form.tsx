"use client";
import { useActionState } from "react";
import { decide } from "./actions";
import type { Decision } from "@/lib/types";
export function DecisionForm({issueKey,decision,enabled}:{issueKey:string;decision:Decision|null;enabled:boolean}) {
  const [state,action,pending]=useActionState(decide,{error:""});
  return <form action={action} className="mt-5">
    <input type="hidden" name="issue_key" value={issueKey}/>
    <fieldset disabled={!enabled || pending} className="decision-form disabled:opacity-50">
      <label>Owner<input name="owner" maxLength={80} defaultValue={decision?.owner ?? ""} placeholder="e.g. Demo team"/></label>
      <label>Priority<select name="priority" defaultValue={decision?.priority ?? ""}><option value="">Choose priority</option>{["P0","P1","P2","P3"].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Status<select name="status" defaultValue={decision?.status ?? "needs_info"}><option value="needs_info">Needs more information</option><option value="approved">Approve for action</option><option value="rejected">Not now</option></select></label>
      <label>Decision note<textarea name="note" rows={3} maxLength={500} defaultValue={decision?.note ?? ""} placeholder="Why are we making this decision?"/></label>
      <p className="text-sm leading-6 text-muted">Save sends this owner, priority, status and note to Lakebase Postgres. You’ll then see the saved database record above.</p>
      <button className="primary-button">{pending ? "Saving to Lakebase…" : "Save owner & decision"}</button>
    </fieldset>
    {state.error && <p role="alert" className="notice mt-4">{state.error}</p>}
  </form>;
}
