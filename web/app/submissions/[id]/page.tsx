import { notFound } from "next/navigation";
import { requireAppAccess } from "@/lib/app-access";
import { submissionStatus } from "@/lib/submissions";
import { submissionId } from "@/lib/submission-model";
import { SubmissionProgress } from "./progress";
export const dynamic = "force-dynamic";
export default async function SubmissionPage({params}:PageProps<"/submissions/[id]">) {
  const actor = await requireAppAccess();
  const {id}=await params;
  if (!submissionId(id)) notFound();
  const initial=await submissionStatus(id,actor);
  return <div className="mx-auto max-w-3xl"><SubmissionProgress initial={initial}/></div>;
}
