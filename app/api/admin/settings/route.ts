import { cookies } from "next/headers";
import { adminCookieName, sessionIsValid } from "@/lib/auth";
import { writeSettings, type PollutionOverride } from "@/lib/db";
import { redirectBack } from "@/lib/redirect";
import { settingsAreUsable } from "@/lib/wall-state";

export const dynamic = "force-dynamic";

async function allowed() {
  const jar = await cookies();
  return sessionIsValid(jar.get(adminCookieName())?.value);
}

export async function POST(request: Request) {
  if (!(await allowed())) {
    return redirectBack(request, "/admin?error=1");
  }
  const form = await request.formData();
  const num = (key: string) => Number(form.get(key));
  const override = String(form.get("pollutionOverride") ?? "auto");
  const pollutionOverride: PollutionOverride =
    override === "force_warning" || override === "suppress_warning" ? override : "auto";
  const next = {
    wallTopMetresCD: num("wallTopMetresCD"),
    overflowMetresCD: num("overflowMetresCD"),
    approachBandMetres: num("approachBandMetres"),
    waterfallWindowMinutes: num("waterfallWindowMinutes"),
    waveAllowanceMetres: num("waveAllowanceMetres"),
    pollutionOverride,
  };
  const inRange =
    next.wallTopMetresCD >= 0 &&
    next.wallTopMetresCD <= 12 &&
    next.overflowMetresCD >= 0 &&
    next.overflowMetresCD <= 12 &&
    next.approachBandMetres >= 0 &&
    next.approachBandMetres <= 2 &&
    next.waterfallWindowMinutes >= 5 &&
    next.waterfallWindowMinutes <= 60 &&
    next.waveAllowanceMetres >= 0 &&
    next.waveAllowanceMetres <= 2;
  if (!inRange || settingsAreUsable(next)) {
    return redirectBack(request, "/admin?error=settings");
  }
  writeSettings(next);
  return redirectBack(request, "/admin");
}
