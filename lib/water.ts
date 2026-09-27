import { BATHING, LINKS } from "./constants";
import { loadCached } from "./cache";

export type QualityBundle = {
  classification: string | null;
  year: number | null;
  source: "environment-agency" | "southern-water-rsw" | "none";
  note: string;
  eaTried: string;
};

export type SewageStatus = "clear" | "recent" | "active" | "unknown";

export type SewageBundle = {
  status: SewageStatus;
  releaseStatus: string | null;
  message: string | null;
  classification: string | null;
  classificationYear: number | null;
  updatedAt: string | null;
  /** End of the latest genuine release, when the history table has one. */
  lastReleaseEnd: string | null;
  eubwid: string | null;
};

const QUALITY_TTL = 6 * 60 * 60 * 1000;
const SEWAGE_TTL = 20 * 60 * 1000;

const EA_URLS = [
  `https://environment.data.gov.uk/doc/bathing-water/${BATHING.eubwid}.json`,
  `https://environment.data.gov.uk/bwq/profiles/profile.json?site=${BATHING.eubwid}`,
];

const CLASS_WORDS = ["Excellent", "Good", "Sufficient", "Poor"];

function findClassification(value: unknown): { classification: string; year: number | null } | null {
  const text = JSON.stringify(value);
  const word = CLASS_WORDS.find((w) => text.includes(w));
  if (!word) return null;
  const yearMatch = text.match(/20\d{2}/);
  return { classification: word, year: yearMatch ? Number(yearMatch[0]) : null };
}

async function fetchEaQuality(): Promise<QualityBundle> {
  let last = "no response";
  for (const url of EA_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; WalpoleBayConditions/0.1; +https://environment.data.gov.uk/bwq/profiles/)",
        },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      last = `${response.status}`;
      if (!response.ok) continue;
      const json = await response.json();
      const found = findClassification(json);
      if (!found) continue;
      return {
        classification: found.classification,
        year: found.year,
        source: "environment-agency",
        note: "Annual bathing-water class from the Environment Agency open data for Walpole Bay, Margate. It is not a sample from this morning.",
        eaTried: `${response.status} ${url}`,
      };
    } catch (error) {
      last = error instanceof Error ? error.message : "failed";
    }
  }
  throw new Error(last);
}

export async function getEaQuality(fresh: boolean) {
  return loadCached("ea-quality", QUALITY_TTL, fresh, fetchEaQuality);
}

const RSW =
  "https://services-eu1.arcgis.com/6qJmARkS2dt2IjVA/arcgis/rest/services/COR_RW_RSW_DATA_VIEW/FeatureServer";

function mapRelease(code: string | null): SewageStatus {
  if (code === "1") return "clear";
  if (code === "2") return "recent";
  if (code === "3") return "active";
  return "unknown";
}

async function lastGenuineReleaseEnd(siteId: number): Promise<string | null> {
  if (!Number.isInteger(siteId)) return null;
  const query = new URL(`${RSW}/4/query`);
  query.searchParams.set("where", `BathingSiteID=${siteId} AND Status='Genuine'`);
  query.searchParams.set("outFields", "Start,End_");
  query.searchParams.set("orderByFields", "Start DESC");
  query.searchParams.set("resultRecordCount", "1");
  query.searchParams.set("returnGeometry", "false");
  query.searchParams.set("f", "json");
  try {
    const response = await fetch(query, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      features?: { attributes?: { Start?: number; End_?: number } }[];
      error?: { message?: string };
    };
    if (json.error) return null;
    const attrs = json.features?.[0]?.attributes;
    const ms = typeof attrs?.End_ === "number" ? attrs.End_ : attrs?.Start;
    if (typeof ms !== "number") return null;
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
}

async function fetchSewage(): Promise<SewageBundle> {
  const query = new URL(`${RSW}/0/query`);
  query.searchParams.set("where", "eubwid='ukj4210-12630'");
  query.searchParams.set(
    "outFields",
    "Id,Name,eubwid,ReleaseStatus,SpillMessage,Current_EA_Classification,EA_Classification_Year",
  );
  query.searchParams.set("returnGeometry", "false");
  query.searchParams.set("f", "json");
  const [siteRes, updatedRes] = await Promise.all([
    fetch(query, { signal: AbortSignal.timeout(8000), cache: "no-store" }),
    fetch(`${RSW}/3/query?where=1%3D1&outFields=Timezone,Last_Updated_Date&f=json`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    }),
  ]);
  if (!siteRes.ok) throw new Error(`Rivers and Seas Watch answered ${siteRes.status}`);
  const site = (await siteRes.json()) as {
    features?: { attributes?: Record<string, unknown> }[];
    error?: { message?: string };
  };
  if (site.error) throw new Error(site.error.message || "Rivers and Seas Watch query failed");
  const attrs = site.features?.[0]?.attributes;
  if (!attrs) throw new Error("Walpole Bay was not on the Rivers and Seas Watch layer.");
  let updatedAt: string | null = null;
  if (updatedRes.ok) {
    const updated = (await updatedRes.json()) as {
      features?: { attributes?: { Last_Updated_Date?: number } }[];
    };
    const ms = updated.features?.[0]?.attributes?.Last_Updated_Date;
    if (typeof ms === "number") updatedAt = new Date(ms).toISOString();
  }
  const release = attrs.ReleaseStatus == null ? null : String(attrs.ReleaseStatus);
  const year = attrs.EA_Classification_Year;
  const siteId = Math.round(Number(attrs.Id));
  return {
    status: mapRelease(release),
    releaseStatus: release,
    message: typeof attrs.SpillMessage === "string" ? attrs.SpillMessage : null,
    classification: typeof attrs.Current_EA_Classification === "string" ? attrs.Current_EA_Classification : null,
    classificationYear: typeof year === "number" ? year : null,
    updatedAt,
    lastReleaseEnd: await lastGenuineReleaseEnd(siteId),
    eubwid: typeof attrs.eubwid === "string" ? attrs.eubwid : BATHING.eubwid,
  };
}

export async function getSewage(fresh: boolean) {
  return loadCached("sewage-walpole-v2", SEWAGE_TTL, fresh, fetchSewage);
}

export const WATER_LINKS = [
  { label: "Swimfo profile", href: LINKS.swimfo },
  { label: "Rivers and Seas Watch", href: LINKS.riversAndSeas },
  { label: "Safer Seas & Rivers", href: LINKS.sas },
];
