import type { Metadata } from "next";
import { Glance } from "@/components/glance";
import { Shell } from "@/components/shell";
import { getConditions } from "@/lib/conditions";
import { parseAtOffsetMinutes, parsePlanWind } from "@/lib/glance-at";
import { parsePictureMode } from "@/lib/section-scene";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today at the pool",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string; mode?: string; at?: string; wind?: string }>;
}) {
  const params = await searchParams;
  const sheet = await getConditions({ fresh: params.fresh === "1" });
  const sectionMode = parsePictureMode(params.mode);
  const initialMinutes = parseAtOffsetMinutes(params.at, new Date(sheet.generatedAt));
  return (
    <Shell active="glance">
      <Glance
        sheet={sheet}
        sectionMode={sectionMode}
        initialMinutes={initialMinutes}
        planWind={parsePlanWind(params.wind)}
      />
    </Shell>
  );
}

