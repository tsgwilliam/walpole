import type { Metadata } from "next";
import { Glance } from "@/components/glance";
import { Shell } from "@/components/shell";
import { getConditions } from "@/lib/conditions";
import type { GlanceMode } from "@/lib/modes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today at the pool",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const sheet = await getConditions({ fresh: params.fresh === "1" });
  const sectionMode = previewMode(params.mode);
  return (
    <Shell active="glance">
      <Glance sheet={sheet} sectionMode={sectionMode} />
    </Shell>
  );
}

/** `?mode=pool|waterfall|sea` only swaps the section clip, for screenshots. */
function previewMode(value: string | undefined): GlanceMode | null {
  if (value === "pool" || value === "waterfall" || value === "sea") return value;
  return null;
}
