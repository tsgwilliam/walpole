import { cookies } from "next/headers";
import { adminCookieName, sessionIsValid } from "@/lib/auth";
import { reviewObservation } from "@/lib/db";
import { redirectBack } from "@/lib/redirect";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  if (!sessionIsValid(jar.get(adminCookieName())?.value)) {
    return redirectBack(request, "/admin?error=1");
  }
  const { id } = await context.params;
  const form = await request.formData();
  const decision = String(form.get("decision") ?? "");
  if (decision === "approved" || decision === "rejected") {
    reviewObservation(Number(id), decision);
  }
  return redirectBack(request, "/admin");
}
