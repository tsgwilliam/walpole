import { NextResponse } from "next/server";
import { insertObservation } from "@/lib/db";
import { predictionSnapshot } from "@/lib/conditions";
import { parseObservation } from "@/lib/options";
import { redirectBack } from "@/lib/redirect";

export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

function limited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 8) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const formPost = !contentType.includes("application/json");
  const forwarded = request.headers.get("x-forwarded-for");
  const key = forwarded?.split(",")[0]?.trim() || "local";
  if (limited(key)) {
    if (formPost) return redirectBack(request, "/observe?error=1");
    return NextResponse.json(
      { error: "Too many notes from this connection in the last hour. Leave it an hour." },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    if (formPost) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      body = await request.json();
    }
  } catch {
    if (formPost) return redirectBack(request, "/observe?error=1");
    return NextResponse.json({ error: "That note did not arrive in one piece." }, { status: 400 });
  }
  const parsed = parseObservation(body);
  if (!parsed.ok) {
    if (formPost) return redirectBack(request, "/observe?error=1");
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const snap = await predictionSnapshot();
  const id = insertObservation({ ...parsed.value, ...snap });
  if (formPost) return redirectBack(request, "/observe?filed=1");
  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
