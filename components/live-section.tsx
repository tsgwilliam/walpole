import { resolveSection, sectionAlt, type SectionInput } from "@/lib/section-scene";
import { SectionCanvas } from "./section-canvas";

/** Animated ink section. `input` is null until there is a tide, unless `?mode=` is set. */
export function LiveSection({ input }: { input: SectionInput | null }) {
  if (!input) {
    return <p className="water-line">No section until there is a tide reading.</p>;
  }
  const section = resolveSection(input);
  return <SectionCanvas input={input} label={sectionAlt(section.mode)} mode={section.mode} />;
}
