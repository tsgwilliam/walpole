import { NextResponse } from "next/server";
import { getConditions } from "@/lib/conditions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const sheet = await getConditions({ fresh });
  return NextResponse.json(sheet, {
    headers: { "Cache-Control": "no-store" },
  });
}
