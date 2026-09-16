export const submissionId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function validateSubmission(value: unknown): { id: string; message: string; rating: number | null } {
  if (!value || typeof value !== "object") throw new Error("Enter your feedback.");
  const input = value as Record<string, unknown>;
  if (typeof input.id !== "string" || !submissionId(input.id)) throw new Error("Invalid submission. Reload the form.");
  if (typeof input.message !== "string") throw new Error("Enter your feedback.");
  const message = input.message.trim();
  if (message.length < 10 || message.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(message))
    throw new Error("Write between 10 and 2,000 characters, without control characters.");
  const rating = input.rating === null || input.rating === undefined ? null : input.rating;
  if (rating !== null && (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5))
    throw new Error("Choose a rating from 1 to 5.");
  return { id: input.id.toLowerCase(), message, rating };
}

export type JobState = { life_cycle_state?: string; result_state?: string };
export type JobRun = {
  run_id: number;
  state?: JobState;
  tasks?: { task_key: string; attempt_number?: number; state?: JobState }[];
};
export function currentTasks(tasks: NonNullable<JobRun['tasks']> = []) {
  const latest = new Map<string, typeof tasks[number]>();
  for (const task of tasks) {
    if ((task.attempt_number ?? 0) >= (latest.get(task.task_key)?.attempt_number ?? -1)) latest.set(task.task_key, task);
  }
  return [...latest.values()].map(t => ({key: t.task_key, state: t.state?.result_state ?? t.state?.life_cycle_state ?? 'PENDING'}));
}
export const terminalRun = (state?: JobState) =>
  ["TERMINATED", "SKIPPED", "INTERNAL_ERROR"].includes(state?.life_cycle_state ?? "");
export const failedRun = (state?: JobState) => terminalRun(state) && state?.result_state !== "SUCCESS";
export const requestToken = (id: string, attempt: number) => `feedback-${id}-${attempt}`;
