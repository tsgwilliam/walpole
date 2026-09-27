import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, sessionIsValid } from "@/lib/auth";
import { listObservations, observationsToCsv } from "@/lib/db";
import { redirectBack } from "@/lib/redirect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const jar = await cookies();
  if (!sessionIsValid(jar.get(adminCookieName())?.value)) {
    return redirectBack(request, "/admin?error=1");
  }
  const csv = observationsToCsv(listObservations());
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"walpole-observations.csv\"",
    },
  });
}
