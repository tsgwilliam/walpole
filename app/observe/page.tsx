import type { Metadata } from "next";
import { ObserveForm } from "@/components/observe-form";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Leave a note",
};

export default async function ObservePage({
  searchParams,
}: {
  searchParams: Promise<{ filed?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Shell active="observe">
      <ObserveForm filed={params.filed === "1"} rejected={params.error === "1"} />
    </Shell>
  );
}
