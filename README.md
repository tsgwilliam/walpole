# Walpole Bay Conditions

A mobile-first notebook for one place: [Walpole Bay Tidal Pool](https://heritage.kent.gov.uk/Designation/DKE22446/), Margate, Kent. It helps a swimmer look at today — tide, weather, bathing-water class, sewage status, and a provisional guess at whether the walls are standing clear.

The name is a placeholder.

## The skin

The paper grid, coral rule, monospace stream, and proof-sheet manners are the **Tributary** skin, shared by **Kem at Glitch Cat Club**. Thank you. The notebook look is his design; this app only borrows it. It is not a Glitch Cat Club product.

## Run

Node.js 22 or newer (the app uses the built-in `node:sqlite` module).

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test    # wall-state, London time, and the chop pilot
npm run lint
npm run build
npm start   # production, same port
```

Observations and the wall numbers live in `data/walpole.sqlite`, created on first run. Fetched tide, weather, and water feeds are cached under `data/cache/`. Neither is committed. On Vercel those files are created under `/tmp` instead, so the glance can render on a read-only app directory. That copy is ephemeral. See [DEPLOY.md](DEPLOY.md).

On a dev machine with no `ADMIN_PASSWORD`, the keeper's desk password is `walpole-dip`. Set a real password before you expose the app.

## Environment

Copy `.env.example` if you want. No API key is required for the default sources. Vercel import and the SQLite limit are in [DEPLOY.md](DEPLOY.md).

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Keeper's desk. Required in production. Dev fallback is `walpole-dip` only when this is unset and `NODE_ENV` is not `production`. |
| `ADMIN_SESSION_SECRET` | Signs the desk cookie. Defaults to the admin password if unset. Set a long random string in production. |
| `CHOP_LIGHT_KT` | Provisional chop pilot, in knots. With `CHOP_STRONG_KT` it splits the wind into five phrases. Default 10. |
| `CHOP_STRONG_KT` | At or above this, a northerly or onshore-ish wind is the top phrase. Default 18. Must sit above `CHOP_LIGHT_KT`. |
| `DATA_DIR` | Optional writable directory for SQLite and the feed cache. Unset locally means `data/`. Unset on Vercel means `/tmp`. |

There is no Admiralty, WorldTides, or Surfers Against Sewage key in this repo. Do not invent one.

## What the glance page is doing

The home sheet is one column: a narrow column on a phone, a wider one on a desktop, still not a multi-panel dashboard. An ink cross-section sits at the top and plays on its own. Under it is a slider from this minute to 24 hours ahead. The slider stays put under the drawing, and sticks to the top of the screen once you scroll on, so it is still in reach over the plan and the tide. Then a plan of the pool with the wind on it, then the mode and how long it lasts, then tide and air. A tide curve for the selected London day comes next — past in grey, the rest in blue, a marker on the selected minute, clock times along the axis — then that day’s highs and lows, water quality, and the sources. The clock is **Europe/London**. The slider starts at now. `?mode=pool`, `waterfall`, `sea`, or `falling` pins the cross-section for a check and does not follow the tide. Leave `mode` off when you want the drawing to move with the slider. `?wind=180,14,18` draws the plan for a wind from 180° at 14 m/s with gusts of 18, so the quieter-water hatch can be looked at on a still day. It does not move the tide or the section.

`/?demo=storm` replaces the next 24 hours of weather, and the tide curve, with a synthetic storm so the hatch, the mean-and-gust mark, the chop, and wall-under can be checked without waiting on the forecast. The gale veers from the southwest through west to the northwest, about 12–20 m/s, gusts about 1.4–1.6 times the mean, sampled every quarter of an hour. Air is cool. The tide is a spring curve: low water at the start of the slider, highs above the crest, so pool, magic waterfall, and sea all appear as you scrub. The sheet is labelled “Demo: synthetic storm — not today’s forecast”. Open-Meteo and EasyTide are not used for those two series while it is set. `?at=` still opens a minute on that demo (`/?demo=storm&at=225m` is the first magic waterfall, `/?demo=storm&at=6h` is near the first high). `?wind=` still forces the plan only, and it wins over the demo wind there; the section and the tide stay on the storm. Leave `demo` off for the live sheet. Poke: [http://127.0.0.1:43123/?demo=storm](http://127.0.0.1:43123/?demo=storm).

The glance names **three modes** in text only. The section is the picture. Pool mode is the enclosed pool, walls showing (the internal “exposed” and “near the top” readings). Sea mode is the walls covered. Magic waterfall is the short window when a rising tide is coming over the wall. The line under the name is how long that mode still lasts, looking forward on the tide curve (past midnight when the next change is overnight). If the curve runs out first, the line says so. The older wall words stay in the model and on the desk; they are not the glance headline.

Wind lives on the plan, not in a separate rose. The plan is north-up: sea and the seaward wall at the top, the beach and the cliff at the bottom, with the east and west walls closing a U. The arrow points the way the wind is blowing. The solid shaft is the average; a lighter shaft past the head is the gust, and that extra length eases in and out unless the device asks for less motion. The line beside it names where the wind is from and where it is going, the average in metres per second, and gusts. The average is Open-Meteo’s hourly speeds over the previous three hours (or “this hour” if only one of those hours is in). At now, direction and gusts are the current reading. Further along the slider they are that hour’s forecast. A southerly says the cliff usually takes some of it, and a wind off the sea says the cliff is little help — the same direction guess as the chop pilot, not a measurement. Other directions, and a missing direction, say the tempering is unknown. Chop thresholds are still in knots.

A soft hatch on the plan is a rough guess at quieter water, labelled as one. Very light wind can mark the whole pool. As the wind rises the hatch shrinks toward the lee of the sheltering side: a southerly leaves it toward the beach. It is not a swim route and not a score. It moves with the scrubbed wind.

The plan is a schematic. Historic England 1421296 (Kent HER DKE22446) gives the seaward wall about 91 m, the landward opening about 168 m, and the beach-to-sea sides about 137 m. The drawing uses those lengths for the taper and does not add a survey. The wall’s thickness is exaggerated so the outline can be read. When the tide is over the crest the wall is drawn dashed, with a light wash and the words “wall under”. Pool mode and magic waterfall keep a solid crest. There is no swim route on it. The crest height and the wall line come from the working geography in [GEOGRAPHY.md](GEOGRAPHY.md).

To check the slider: open the glance and drag the line under the drawing. The clock under the scale should leave “Now” and the mode, the ink (sea level, chop, overflow), the plan’s wind arrow, tide, air, the tide curve’s day and marker, and the highs and lows should follow that future minute. `/?at=6h` or `/?at=90m` opens that far ahead of the sheet time. `/?at=2026-10-01T18:30` is a Europe/London civil time with no offset; an ISO time with `Z` is absolute. Times before the sheet clamp to now, and times past 24 hours clamp to the end of the slider.

Annual bathing class, the wall-top and overflow heights, and the old “this hour measured” table are not on this column — the desk still holds the two heights, and About still explains the class. The section is a black-ink drawing on the paper: a short beach on the left, a flat chalk floor, one outlined wall, sea on the right. Crest in the drawing is the desk’s wall-top height. Mean tide sets the sea and which picture it is (pool, swell skimming the crest, sea over the wall, or the tide falling with the pool left full). Open-Meteo Marine, when it answers, sets the swell; otherwise the wind stands in. The chop pilot still sets how busy the water lines are. The five-phrase ladder and the notes list are off this screen. A note is still filed at `/observe`.

**Water choppiness** is a provisional pilot, not a forecast and not a zone map. It uses the Open-Meteo wind at the pool pin (knots = mph × 0.868976) and five phrases: still as bathwater, the odd splash, you gonna be spitting water, face splashin a plenty, and wave machine at Center Parks is on. The phrase is in the screen-reader line; the drawing uses the same level for how many water lines there are, and how fast and loose they move. Below half of `CHOP_LIGHT_KT` (default 10) is bathwater; up to light is the odd splash; up to the midpoint with `CHOP_STRONG_KT` (default 18) is spitting; up to strong, or a strong wind that is not onshore, is face splashin; a strong onshore wind — N, NNE, NE, ENE, NW, NNW, WNW — is the wave machine. S, SSE, SSW, SW, and WSW step the result down one, because the cliff along the south shelters the pool and northerlies hit it. A southerly also calms the pool side of the drawing a little more than the sea. The water-quality lines lead with warnings, then days since the last genuine release on Rivers and Seas Watch. If that history has no date, the line says so. It does not turn the 72-hour flag into a day count.

**Wall reading** (provisional, not a score):

- Walls exposed — tide comfortably below the overflow
- Water near top — inside the approach band, or over the lip outside the short window
- Magic waterfall time — about 15 minutes after a *rising* tide crosses the overflow, while the wall top is still showing
- Walls covered — prediction at or above the wall top

Historic England's list description (Kent HER [DKE22446](https://heritage.kent.gov.uk/Designation/DKE22446/)) says the seaward wall is about seven feet above the chalk, with overflows six inches below the top, and that the wall was set so the pool is submerged at every tide. Those figures are relative to the chalk floor, **not Chart Datum**.

The database is seeded with a working estimate, not a finished survey:

- `wallTopMetresCD` = 3.50 (about ±0.2 m; see [GEOGRAPHY.md](GEOGRAPHY.md))
- `overflowMetresCD` = 3.35 (six inches, 0.15 m, below that crest)

The old round pair, 4.00 and 3.85, is replaced on open if it is still stored untouched. A keeper who has edited either number is left alone. `waveAllowanceMetres` is a stub added to the predicted height before the comparison. It defaults to 0 and is not a wave model.

Approved observation notes do **not** move the live reading. They are a learning set: each new note stores the forecast height and state at the moment it was filed, next to what the person saw. Calibration is comparing those over time, then editing the two heights by hand.

## Data sources

**Tides.** UKHO ADMIRALTY [EasyTide](https://easytide.admiralty.co.uk/) for Margate, station `0103`, about 1.8 km from the pool pin (51.39292°N, 1.40422°E). The app reads the public JSON the EasyTide website uses (`/Home/GetPredictionData?stationId=0103`). No key. This is a free leisure feed, not a supported API contract. If it fails, the wall reading is withheld rather than invented, and any earlier cache is labelled stale. Cached about six hours.

The official programmatic alternative is the [Admiralty Tidal API](https://www.admiralty.co.uk/access-data/apis). The Discovery tier can be free for high and low waters and needs a key you obtain yourself. Paid tiers add interval heights. This build does not call it.

**Weather.** [Open-Meteo](https://open-meteo.com/) at the pool coordinates. No key. Cached about three hours. It is a model, not an anemometer on the promenade. Credit: weather data by Open-Meteo.com.

**Bathing water.** Environment Agency / Swimfo profile for Walpole Bay, Margate, eubwid `ukj4210-12630`: [profile](https://environment.data.gov.uk/bwq/profiles/profile.html?site=ukj4210-12630). The app tries the EA JSON first. Some networks get HTTP 403 from that host. When that happens the annual class falls back to the figure Southern Water publishes for the same bathing water, and the page says so. It will not invent a classification. The class is an annual rating, not this morning's sample. The monitored season is 1 May–30 September.

**Sewage.** Thanet wastewater is **Southern Water** (named on the bathing-water record as Southern Water Services Limited). Near-real-time status comes from their public [Rivers and Seas Watch](https://riversandseaswatch.southernwater.co.uk/) feature service, bathing site `WALPOLE BAY MARGATE`. A release marked in the last 24 or 72 hours raises the banner. Cached about 20 minutes.

[Surfers Against Sewage Safer Seas & Rivers](https://www.sas.org.uk/water-quality/sewage-pollution-alerts/safer-seas-rivers-service/) does not offer a keyless public API this app can call, so SAS is a link-out only. Southern Water also left the shared Water UK ArcGIS storm-overflow pattern in 2026; the Rivers and Seas Watch layer is the feed that actually covers this beach.

The keeper can force the warning on, or suppress the automatic banner. A suppression is still mentioned on the sheet.

## Notes, desk, export

`/observe` is an anonymous structured form. Required for calibration: wall state, roughly when, where in the pool (landward / middle / seaward), overall feel. Temperature, wind, clarity, crowd, wildlife, and “would you swim again?” are optional fixed lists. No free text, no photos, no accounts.

Submissions land as `pending`. The desk at `/admin` approves or rejects them. Only approved notes appear on the glance page. Two approved demo notes and one pending demo note are seeded and marked “demo plate”.

CSV of every row, including rejected and the forecast snapshot: the desk’s “Download the spreadsheet” link (`/api/admin/export`), while the cookie is valid. Retention is indefinite; there are no photos.

## Offline

The app is an installable PWA (`public/manifest.webmanifest`). A small service worker caches the last successful glance page and `/api/conditions`, plus icons. At the beach with no signal you should see the last sheet, not a blank error. It does not queue a note for later, and it does not send push alerts. Admin pages are not cached.

## Later

Wind, tide, and warmth do not feel the same at the landward end, the middle, and the seaward wall. A later version could model those zones from the approved notes. Also out of scope here: a go/no-go score, more than one site, photos, open text, reporter accounts, push alerts, and a finished survey of the wall.
