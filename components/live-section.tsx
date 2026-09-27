import type { GlanceMode } from "@/lib/modes";
import { glanceMode } from "@/lib/modes";
import type { WallStateId } from "@/lib/wall-state";

const CLIP: Record<GlanceMode, { src: string; alt: string }> = {
  pool: {
    src: "/section/pool.png",
    alt: "Pool mode. The sea sits below the wall, and water is held in the pool.",
  },
  waterfall: {
    src: "/section/waterfall.png",
    alt: "Magic waterfall. The tide is spilling over the wall into the pool.",
  },
  sea: {
    src: "/section/sea.png",
    alt: "Sea mode. The wall is under a continuous surface.",
  },
};

/**
 * Tom's three tidal-cycle clips. The existing mode (tide against the wall
 * crest) picks which one is shown. No hand-drawn section.
 */
export function LiveSection({
  state,
  mode,
}: {
  state: WallStateId | null;
  /** Screenshot stub. The live page leaves this unset and uses `state`. */
  mode?: GlanceMode | null;
}) {
  const shown = mode ?? (state ? glanceMode(state) : null);
  if (!shown) {
    return <p className="water-line">No section until there is a tide reading.</p>;
  }
  const clip = CLIP[shown];
  return (
    // The clip is a finished illustration; next/image would re-encode it.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="section-clip" src={clip.src} alt={clip.alt} />
  );
}
