import Link from "next/link";
const stages = [
  ["1", "Save the customer’s feedback", "The app saves the message in Lakebase Postgres, then requests a Lakeflow Job using the saved submission’s ID. Saving a database row by itself does not start the job."],
  ["2", "Prepare and analyze", "The job reads that submission, masks contact details and compares it with the saved analysis. Only new or changed text needs AI classification."],
  ["3", "Group and publish", "The workflow attaches an issue label, checks the records and publishes the validated results. A completion receipt in Lakebase tells the app the result is ready."],
  ["4", "Let the team act", "The overview reads the saved analysis through Databricks SQL. Owners, priorities and decision notes are saved separately in Lakebase, so processing feedback does not overwrite them."],
];
export default function Workflow() {
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/" className="text-sm text-muted">← Feedback overview</Link>
    <div><p className="eyebrow">FROM CUSTOMER TO TEAM</p><h1 className="mt-3 text-3xl font-semibold">One submission. An automatic workflow.</h1><p className="mt-3 text-sm leading-7 text-muted">Submit feedback, watch it become a saved insight, then decide what to do. Genie Code helps build the workflow; the job runs the saved code.</p></div>
    <Link href="/submit" className="primary-button">Submit feedback →</Link>
    <div className="space-y-3">{stages.map(([n,title,description])=><section key={n} className="panel flex gap-5 p-6"><span className="text-2xl font-mono text-accent">0{n}</span><div><h2>{title}</h2><p className="mt-2 text-sm leading-7 text-muted">{description}</p></div></section>)}</div>
    <p className="text-sm leading-7 text-muted">The app requests a run after submission; there is no schedule or database change trigger. Requests use a stable ID to prevent duplicate runs when retried. You can close the page while the job works.</p>
  </div>;
}
