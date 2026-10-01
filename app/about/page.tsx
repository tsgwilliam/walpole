import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About the sheet",
};

export default function AboutPage() {
  return (
    <Shell active="about">
      <article className="panel">
        <p className="kicker">Colophon</p>
        <h1 className="state-title" style={{ fontSize: 32 }}>About this sheet</h1>
        <p className="blurb">
          Walpole Bay Conditions is a placeholder name. It is a notebook for one place: the tidal
          pool at Walpole Bay, Margate, about 51.39292°N, 1.40422°E. It puts the tide, the weather,
          the official water notes, and a provisional wall reading on one sheet. It does not score
          the swim or tell you to get in.
        </p>
        <h2>The wall reading</h2>
        <p className="fine">
          Historic England&apos;s list description (Kent Historic Environment Record{" "}
          <a href={LINKS.listing}>DKE22446</a>) says the seaward wall is about seven feet above the
          chalk, with two-foot overflows set six inches below the top, and that the wall was built
          so the pool is submerged at every tide. Those heights are relative to the pool floor, not
          Chart Datum. The app stores two keeper-edited numbers, <span className="mono">wallTopMetresCD</span>{" "}
          and <span className="mono">overflowMetresCD</span>, seeded at 3.50 m and 3.35 m. The crest
          is a working estimate from a 2020 elevation model, about 3.5 m above Chart Datum, give or
          take 0.2 m. The overflow stays six inches under it. It is not a finished survey. Predicted
          Margate tide height, plus a wave-allowance stub that defaults to zero, is compared with
          those numbers.
        </p>
        <p className="fine">
          Walls exposed means the tide is comfortably below the overflow. Water near the top means
          it is inside an approach band, or already over the lip but outside the short window.
          Magic waterfall time is about fifteen minutes after a rising tide crosses the overflow,
          while the wall top is still showing. Walls covered means the prediction is at or above
          the wall top. The phrase can change later. The reading is always provisional.
        </p>
        <p className="fine">
          Notes people file do not move the live reading. A keeper approves or rejects them. The
          approved ones show on the glance page. All of them, including rejected ones, stay in the
          database so the forecast can be compared with what someone actually saw. That is how the
          wall numbers get calibrated. There is no score, and no traffic light.
        </p>
        <h2>Where the numbers come from</h2>
        <p className="fine">
          Tides are UKHO ADMIRALTY EasyTide predictions for Margate, station 0103, about 1.8 km from
          the pool. EasyTide is a free leisure service. This app reads the same public JSON the
          EasyTide site uses (<span className="mono">GetPredictionData</span>). It is not an official
          supported API. If you need a contract, the{" "}
          <a href={LINKS.admiraltyApi}>Admiralty Tidal API</a> has a free Discovery tier for high
          and low waters and paid tiers for heights; set that up yourself, this build does not ship
          a key. Heights are cached for about six hours.
        </p>
        <p className="fine">
          Weather is <a href={LINKS.openMeteo}>Open-Meteo</a> at the pool coordinates. No key.
          Cached for about three hours, which is enough for a few refreshes a day. It is a model,
          not a vane on the promenade.
        </p>
        <p className="fine">
          Bathing water is Walpole Bay, Margate, eubwid ukj4210-12630, on the Environment Agency
          Swimfo profile. The app tries the EA open-data JSON first. From some networks that host
          answers 403, so the annual class can fall back to the figure Southern Water publishes on
          Rivers and Seas Watch for the same bathing water. Either way the page says which one you
          are looking at, and links to Swimfo. It will not invent a class.
        </p>
        <p className="fine">
          Sewage: Thanet is Southern Water, confirmed on the bathing-water record (Southern Water
          Services Limited). Their public Rivers and Seas Watch feature service carries a release
          status for Walpole Bay. A release in the last 24 or 72 hours raises the warning banner.
          Surfers Against Sewage Safer Seas & Rivers does not publish a keyless API this app can
          call, so SAS is a link-out. The keeper can force the banner on, or suppress the automatic
          one; a suppression is still mentioned on the sheet so it is not a silent hide.
        </p>
        <h2>The skin</h2>
        <p className="blurb">
          Thank you to Kem at Glitch Cat Club for sharing the Tributary skin. The paper grid, the
          coral rule, the monospace stream, and the proof-sheet manners are his design. This app
          uses that look for a swimming notebook. It is not a Glitch Cat Club product.
        </p>
        <h2>Later, not now</h2>
        <p className="fine">
          A later sheet could learn how wind, tide, and warmth differ between the landward end, the
          middle, and the seaward wall — the pool is four acres and it does not feel like one place.
          Also out of this version: a score, more than one site, photos, open text, accounts for
          people leaving notes, push alerts, and a surveyed wall datum.
        </p>
      </article>
    </Shell>
  );
}
