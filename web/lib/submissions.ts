import "server-only";
import { lakebasePool, hasLakebase } from "./lakebase";
import { workspaceRequest } from "./databricks";
import { failedRun, terminalRun, requestToken, currentTasks, type JobRun } from "./submission-model";
import { issueKey } from "./feedback-model";
import { invalidateFeedbackSnapshot } from "./feedback";

export const submissionsEnabled = () => hasLakebase() && Boolean(process.env.SUBMISSION_JOB_ID);
function jobId() {
  const id = process.env.SUBMISSION_JOB_ID ?? "";
  if (!/^\d+$/.test(id)) throw new Error("Feedback processing is not connected yet.");
  return Number(id);
}
type Row = {
  id: string; message_text: string; rating: number | null; created_by: string;
  run_id: string | null; attempt: number; dispatch_error: string | null;
  result: Record<string, unknown> | null; created_at: Date;
};
async function row(id: string, actor: string) {
  const record: Row | undefined = (await lakebasePool().query(
    "SELECT * FROM papaeats_app.feedback_submissions WHERE id=$1 AND created_by=$2", [id, actor],
  )).rows[0];
  if (!record) throw new Error("Submission not found.");
  return record;
}

// Save first: a failed/uncertain network request cannot lose the customer's text.
// Repeating the same request ID returns the same row and Databricks run.
export async function submitFeedback(input: { id: string; message: string; rating: number | null }, actor: string) {
  if (!submissionsEnabled()) throw new Error("Feedback processing is not connected yet.");
  const db = await lakebasePool().connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`submissions:${actor}`]);
    const existing: Row | undefined = (await db.query("SELECT * FROM papaeats_app.feedback_submissions WHERE id=$1", [input.id])).rows[0];
    if (existing) {
      if (existing.created_by !== actor || existing.message_text !== input.message || existing.rating !== input.rating)
        throw new Error("This submission ID was already used. Open a new form.");
    } else {
      const count = (await db.query("SELECT count(*)::int AS n FROM papaeats_app.feedback_submissions WHERE created_by=$1 AND created_at > now() - interval '1 hour'", [actor])).rows[0].n;
      if (count >= 10) throw new Error("The demo allows 10 submissions per hour. Please try later.");
      await db.query("INSERT INTO papaeats_app.feedback_submissions (id,message_text,rating,created_by) VALUES ($1,$2,$3,$4)", [input.id,input.message,input.rating,actor]);
    }
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
  await dispatch(input.id, actor);
}

async function dispatch(id: string, actor: string) {
  const record = await row(id, actor);
  if (record.run_id || record.result) return;
  try {
    const run = await workspaceRequest<{run_id: number}>("/api/2.2/jobs/run-now", {
      job_id: jobId(), idempotency_token: requestToken(id, record.attempt),
      job_parameters: { submission_id: id },
    });
    if (!Number.isSafeInteger(run.run_id)) throw new Error("Missing run ID.");
    await lakebasePool().query("UPDATE papaeats_app.feedback_submissions SET run_id=$2, dispatch_error=NULL WHERE id=$1 AND attempt=$3", [id,run.run_id,record.attempt]);
  } catch {
    await lakebasePool().query("UPDATE papaeats_app.feedback_submissions SET dispatch_error='Your feedback is saved. Retry starting the workflow.' WHERE id=$1 AND run_id IS NULL AND result IS NULL", [id]);
  }
}

export async function submissionStatus(id: string, actor: string) {
  const record = await row(id, actor);
  let run: JobRun | undefined;
  let unavailable = false;
  if (record.run_id) {
    try { run = await workspaceRequest<JobRun>(`/api/2.2/jobs/runs/get?run_id=${record.run_id}`); }
    catch { unavailable = true; }
  }
  const complete = Boolean(record.result);
  if (complete) invalidateFeedbackSnapshot();
  const failed = !complete && (failedRun(run?.state) || terminalRun(run?.state));
  return {
    id, message: record.message_text, createdAt: record.created_at.toISOString(),
    status: complete ? "completed" : failed ? "failed" : record.run_id ? "processing" : "saved",
    error: unavailable && !complete ? "Progress is temporarily unavailable. Your feedback is saved; checking again shortly." : failed ? "Processing stopped. Your feedback is saved and can be retried." : record.dispatch_error,
    canRetry: !complete && (failed || !record.run_id),
    tasks: currentTasks(run?.tasks),
    runUrl: record.run_id ? `${process.env.DATABRICKS_HOST}/jobs/${jobId()}/runs/${record.run_id}` : null,
    traceUrl: record.result?.mlflow_trace_id && /^\d+$/.test(String(record.result.mlflow_experiment_id ?? ""))
      ? `${process.env.DATABRICKS_HOST}/ml/experiments/${record.result.mlflow_experiment_id}` : null,
    result: record.result,
    issueUrl: record.result?.issue_type ? `/issues/${issueKey(String(record.result.issue_cat ?? record.result.category), String(record.result.issue_type))}` : null,
  };
}

export async function retrySubmission(id: string, actor: string) {
  const record = await row(id, actor);
  if (record.result) return;
  if (record.run_id) {
    // A timeout is not proof that a run failed. Only a terminal run permits a new attempt.
    const run = await workspaceRequest<JobRun>(`/api/2.2/jobs/runs/get?run_id=${record.run_id}`);
    if (!terminalRun(run.state)) return;
    await lakebasePool().query("UPDATE papaeats_app.feedback_submissions SET attempt=attempt+1,run_id=NULL,dispatch_error=NULL WHERE id=$1 AND attempt=$2 AND result IS NULL", [id,record.attempt]);
  }
  await dispatch(id, actor);
}

export async function recentSubmissions(actor: string) {
  if (!submissionsEnabled()) return [];
  const records = await lakebasePool().query(
    "SELECT id,message_text,result IS NOT NULL AS complete FROM papaeats_app.feedback_submissions WHERE created_by=$1 ORDER BY created_at DESC LIMIT 5", [actor],
  );
  return records.rows as {id:string;message_text:string;complete:boolean}[];
}
