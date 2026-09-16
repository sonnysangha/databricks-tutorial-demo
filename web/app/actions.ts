"use server";

import { revalidatePath } from "next/cache";
import { requireAppAccess } from "@/lib/app-access";
import { redirect } from "next/navigation";
import { saveDecision } from "@/lib/issues";
import type { DecisionStatus } from "@/lib/types";

const STATUSES: DecisionStatus[] = ["approved", "rejected", "needs_info"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];

export async function decide(_previous: {error:string}, formData: FormData) {
  const issueKey = String(formData.get("issue_key") ?? "").trim();
  try {
    await requireAppAccess();
    const status = String(formData.get("status") ?? "");
    const priority = String(formData.get("priority") ?? "");
    const owner = String(formData.get("owner") ?? "").trim().slice(0, 80);
    const note = String(formData.get("note") ?? "").trim().slice(0, 500);

    if (!/^[a-z0-9-]{2,64}$/.test(issueKey)) throw new Error("Bad issue key");
    if (!STATUSES.includes(status as DecisionStatus)) throw new Error("Bad status");

    await saveDecision({
      issue_key: issueKey,
      status: status as DecisionStatus,
      priority: PRIORITIES.includes(priority) ? priority : null,
      owner: owner || null,
      note: note || null,
    });
  } catch {
    return {error: "The decision could not be saved. Check the form and try again."};
  }

  revalidatePath("/");
  revalidatePath(`/issues/${issueKey}`);
  revalidatePath("/decisions");
  redirect(`/issues/${encodeURIComponent(issueKey)}?saved=1#saved-decision`);
}
