import type { Metadata } from "next";
import { Glance } from "@/components/glance";
import { Shell } from "@/components/shell";
import { getConditions } from "@/lib/conditions";
import { parseAtOffsetMinutes, parsePlanWind } from "@/lib/glance-at";
import { parsePictureMode } from "@/lib/section-scene";
import { applyStormDemo, isStormDemo, STORM_DEMO_LABEL } from "@/lib/storm-demo";

export const dynamic = "force-dynamic";

type GlanceQuery = {
  fresh?: string;
  mode?: string;
  at?: string;
  wind?: string;
  demo?: string | string[];
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<GlanceQuery>;
}): Promise<Metadata> {
  const params = await searchParams;
  if (isStormDemo(params.demo)) {
    return { title: "Demo storm — not today's forecast" };
  }
  return { title: "Today at the pool" };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<GlanceQuery>;
}) {
  const params = await searchParams;
  const demo = isStormDemo(params.demo);
  const loaded = await getConditions({ fresh: params.fresh === "1", liveMarine: !demo });
  const sheet = demo ? applyStormDemo(loaded) : loaded;
  const sectionMode = parsePictureMode(params.mode);
  const initialMinutes = parseAtOffsetMinutes(params.at, new Date(sheet.generatedAt));
  return (
    <Shell active="glance">
      <Glance
        sheet={sheet}
        sectionMode={sectionMode}
        initialMinutes={initialMinutes}
        planWind={parsePlanWind(params.wind)}
        demoLabel={demo ? STORM_DEMO_LABEL : null}
      />
    </Shell>
  );
}

