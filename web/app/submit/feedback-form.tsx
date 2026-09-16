"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeedbackForm({enabled}: {enabled:boolean}) {
  const router = useRouter();
  const [id] = useState(() => crypto.randomUUID());
  const [message,setMessage] = useState("");
  const [rating,setRating] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  return <form className="decision-form" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/submissions", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,message,rating:rating ? Number(rating):null})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/submissions/${data.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit. Please retry."); setBusy(false); }
  }}>
    <label htmlFor="feedback-message">Your feedback
      <textarea id="feedback-message" name="message" rows={6} minLength={10} maxLength={2000} required disabled={busy || !enabled} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What went well? What could we improve?" className="!text-base !leading-7" />
    </label>
    <div className="flex items-center justify-between gap-4 text-xs text-muted">
      <span>Use fictional feedback for this demo. Avoid contact details.</span>
      <span>{message.length}/2,000</span>
    </div>
    <label htmlFor="feedback-rating">Rating (optional)
      <select id="feedback-rating" name="rating" disabled={busy || !enabled} value={rating} onChange={e=>setRating(e.target.value)}>
        <option value="">No rating</option>
        {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} {n===1 ? "star":"stars"}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="notice">{error}</p>}
    {!enabled && <p className="notice">Feedback submission is not connected yet.</p>}
    <button disabled={busy || !enabled} className="primary-button !py-3 !text-sm disabled:opacity-50">{busy ? "Saving your feedback…" : "Submit feedback"}</button>
    <p className="text-xs leading-6 text-muted">Your feedback is saved first. Analysis starts automatically and usually takes a few minutes.</p>
  </form>;
}
