import { requireAppAccess } from "@/lib/app-access";
import { submissionId } from "@/lib/submission-model";
import { submissionStatus } from "@/lib/submissions";
export const runtime = "nodejs";
export async function GET(_request: Request, context: {params: Promise<{id:string}>}) {
  try {
    const actor = await requireAppAccess();
    const {id} = await context.params;
    if (!submissionId(id)) throw new Error("Invalid submission.");
    return Response.json(await submissionStatus(id, actor), {headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Unable to load this submission."}, {status:404}); }
}
