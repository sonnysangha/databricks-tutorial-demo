import { requireAppAccess, requireSameOrigin } from "@/lib/app-access";
import { validateSubmission } from "@/lib/submission-model";
import { submitFeedback } from "@/lib/submissions";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireAppAccess();
    if (Number(request.headers.get("content-length") ?? 0) > 10000)
      return Response.json({error:"Feedback is too long."}, {status:413});
    const input = validateSubmission(await request.json());
    await submitFeedback(input, actor);
    return Response.json({ id:input.id }, {status:201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit feedback.";
    const safe = /^(Enter|Invalid submission|Write between|Choose a rating|This submission ID|This page's address|The demo allows|Feedback processing|Sign in)/.test(message);
    return Response.json({error: safe ? message : "Unable to save feedback. Please retry."}, {status:400});
  }
}
