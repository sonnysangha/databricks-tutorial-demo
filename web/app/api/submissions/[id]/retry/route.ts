import { requireAppAccess, requireSameOrigin } from "@/lib/app-access";
import { submissionId } from "@/lib/submission-model";
import { retrySubmission } from "@/lib/submissions";
export const runtime = "nodejs";
export async function POST(request: Request, context: {params: Promise<{id:string}>}) {
  try {
    requireSameOrigin(request);
    const actor = await requireAppAccess();
    const {id} = await context.params;
    if (!submissionId(id)) throw new Error("Invalid submission.");
    await retrySubmission(id, actor);
    return Response.json({ok:true});
  } catch { return Response.json({error:"Unable to restart processing. Try again shortly."}, {status:400}); }
}
