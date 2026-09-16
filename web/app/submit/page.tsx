import Link from "next/link";
import { FeedbackForm } from "./feedback-form";
import { submissionsEnabled, recentSubmissions } from "@/lib/submissions";
import { requireAppAccess } from "@/lib/app-access";
export const dynamic = "force-dynamic";
export default async function SubmitPage() {
  const actor = await requireAppAccess();
  const recent = await recentSubmissions(actor);
  return <div className="mx-auto max-w-2xl space-y-6">
    <Link href="/" className="text-sm text-muted">← Feedback overview</Link>
    <div><p className="eyebrow">PAPAEATS / CUSTOMER FEEDBACK</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Every message matters.</h1><p className="mt-3 text-sm leading-7 text-muted">Tell us about your experience. We’ll organize your feedback so the team can take action.</p></div>
    <section className="panel p-6 sm:p-8"><FeedbackForm enabled={submissionsEnabled()} /></section>
    {recent.length > 0 && <section className="panel p-6"><h2>Recent feedback</h2><ul className="mt-4 space-y-4">{recent.map(item=><li key={item.id}><Link href={`/submissions/${item.id}`} className="flex items-start justify-between gap-4 text-sm"><span className="line-clamp-2">{item.message_text}</span><span className="shrink-0 text-xs text-accent">{item.complete ? "View result" : "Check progress"} →</span></Link></li>)}</ul></section>}
    <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted"><span>01 · You submit</span><span>02 · AI organizes</span><span>03 · The team acts</span></div>
  </div>;
}
