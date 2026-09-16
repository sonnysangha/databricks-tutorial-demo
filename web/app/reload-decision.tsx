"use client";
export function ReloadDecision() {
  return <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={()=>window.location.reload()}>Reload from database ↻</button>;
}
