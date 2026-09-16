"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { submissionStatus } from "@/lib/submissions";
import { nice } from "@/lib/feedback-model";
type Status = Awaited<ReturnType<typeof submissionStatus>>;
const steps = [["prepare_feedback","Prepare feedback"],["analyze_changes","Analyze the message"],["group_and_check","Group and check"],["publish_results","Publish the result"]];
export function SubmissionProgress({initial}: {initial:Status}) {
  const [data,setData]=useState(initial);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if (data.status === "completed" || data.status === "failed") return;
    let disposed=false;
    let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try {
        const response=await fetch(`/api/submissions/${initial.id}`,{cache:"no-store"});
        if (!response.ok) throw new Error();
        const next = await response.json();
        if (!disposed) {setData(next);setError("");}
      } catch {if (!disposed) setError("Connection interrupted. Your feedback is saved; checking again shortly.");}
      finally {if (!disposed) timer=setTimeout(poll,5000);}
    };
    timer=setTimeout(poll,2000);
    return ()=>{disposed=true;clearTimeout(timer);};
  },[initial.id,data.status]);
  const result=data.result;
  return <div className="space-y-6">
    <div aria-live="polite"><p className="eyebrow">CUSTOMER FEEDBACK / {data.status.toUpperCase()}</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{result ? "Your feedback is ready." : data.status==="failed" ? "Your feedback is safe." : "Received. We’re on it."}</h1>
      <p className="mt-3 text-sm leading-7 text-muted">{result ? "The analysis is saved. The team can review the evidence and decide what happens next." : "Your message is saved. You can leave this page and return to the same link to check its progress."}</p>
    </div>
    {result && <section className="panel p-6 space-y-5">
      <div><p className="eyebrow">SAVED AI ANALYSIS</p><h2 className="mt-3 !text-xl">{result.issue_type ? String(result.issue_type) : nice(String(result.category))}</h2></div>
      <div className="flex flex-wrap gap-2"><span className="source-badge">{nice(String(result.category))}</span><span className="source-badge">{nice(String(result.sentiment))} sentiment</span>{result.uncertain_classification===true && <span className="review-badge text-xs">Needs human review</span>}</div>
      <p className="text-sm leading-7 text-muted">{String(result.explanation)}</p>
      <p className="text-xs text-muted">{Number(result.processed).toLocaleString()} analyzed · {Number(result.skipped).toLocaleString()} existing results reused</p>
      {data.traceUrl && <p className="text-sm text-muted">See what the AI received and returned: <a href={data.traceUrl} target="_blank" rel="noreferrer" className="text-accent">Open MLflow traces ↗</a></p>}
      <div className="flex flex-wrap gap-3">{data.issueUrl && <Link href={data.issueUrl} className="primary-button">Review issue &amp; assign owner →</Link>}<Link href={`/?q=${encodeURIComponent(String(result.feedback_id))}#messages`} className="rounded-lg border border-border px-4 py-2 text-sm">View in overview</Link></div>
    </section>}
    <section className="panel p-6"><p className="eyebrow">YOUR MESSAGE</p><blockquote className="mt-3 text-base leading-8">{data.message}</blockquote></section>
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3"><h2>From feedback to action</h2>{data.runUrl && <a href={data.runUrl} target="_blank" rel="noreferrer" className="text-xs text-accent">View workflow ↗</a>}</div>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2">
        {steps.map(([key,label],index)=>{
          const state=result ? "SUCCESS" : data.tasks.find(t=>t.key===key)?.state ?? "PENDING";
          const done=state==="SUCCESS";
          const active=["RUNNING","PENDING","QUEUED","BLOCKED","WAITING_FOR_RETRY"].includes(state);
          return <li key={key} className="rounded-xl border border-border p-4"><div className="flex items-center gap-3"><span className={done ? "text-emerald-400" : "text-muted"}>{done ? "✓" : `0${index+1}`}</span><span className="text-sm">{label}</span></div><p className="mt-2 pl-7 text-xs text-muted">{done ? "Complete" : state==="RUNNING" ? "Working…" : active ? "Waiting" : nice(state)}</p></li>;
        })}
      </ol>
      {!result && data.status!=="failed" && <p className="mt-4 text-xs text-muted">Processing can take a few minutes. This page updates automatically.</p>}
    </section>
    {(error || data.error) && <p role="status" className="notice">{error || data.error}</p>}
    {data.canRetry && <button className="primary-button" disabled={busy} onClick={async()=>{
      setBusy(true);setError("");
      try {
        const response=await fetch(`/api/submissions/${data.id}/retry`,{method:"POST"});
        if (!response.ok) throw new Error();
        const refreshed=await fetch(`/api/submissions/${data.id}`,{cache:"no-store"});
        if (!refreshed.ok) throw new Error();
        setData(await refreshed.json());
      } catch {setError("Unable to restart processing. Please try again shortly.");}
      finally {setBusy(false);}
    }}>{busy ? "Starting…" : "Retry processing"}</button>}
    <Link href="/submit" className="inline-block text-sm text-accent">Submit another message →</Link>
  </div>;
}
