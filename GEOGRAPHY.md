# Walpole Bay tidal pool — working geography

A starter frame for the drawings. Provisional. Not a survey you should build to.

## Datum

Margate Chart Datum. The working conversion (PLA 2024) is:

**height above Chart Datum = height above Ordnance Datum Newlyn + 2.50 m**

Admiralty Tide Tables Table III still needs a proper check. Until then the app uses +2.50.

## Axes

Origin: the **middle of the seaward wall crest**.

| Axis | Direction | Unit |
| --- | --- | --- |
| X | East | metres |
| Y | North | metres |
| Z | Up | metres above Chart Datum |

Approximate OSGB36 of that origin: **E 636910, N 171595**, give or take about 40 m. The easting is the middle of the central-wall scan in the 1 Oct 2026 notes. The northing is the middle of the seaward-face band (N 171560–171630). It is not a surveyed station.

The published pin (NGR TR 3692 7151, about E 636920 N 171510) sits roughly 10 m east and 85 m south of this origin.

OSM outline of the pool (way 98464382): E 636831–637011, N 171436–171603.

## Heights used by the app

| Thing | Value | Uncertainty | Where it comes from |
| --- | --- | --- | --- |
| Wall crest | **3.5 m CD** | ±0.2 m | EA DTM 2020-09-19/20, central seaward wall. Replaces the old 4.0 m placeholder. |
| Overflow | **3.35 m CD** | follows the crest | Six inches (0.15 m) under the crest, as in the Historic England list. |
| Chalk at the seaward wall | **1.4 m CD** | ±0.3 m | Crest minus about 2.1 m. Inferred. The 2020 lidar “floor” was water, about 0.2 m under the crest. |
| Wall above chalk | **2.1 m** | — | That inference. Historic England says about seven feet (2.13 m). |
| Foreshore north of the wall | about **0.3–0.8 m CD** | strip, not a point | Same 2020 model. A typical middle is about 0.5 m. |
| Soft beach | about **12%** over about **35 m** | 11–13%, 30–40 m | Inland of the landward lip, before the promenade. Then a hard step. |

The section drawing keeps a short beach and a **flat** chalk floor. A true 12% rise over 35 m would leave the frame (it is about two wall-heights). The ink is fitted to the page. The numbers above are the ones to argue with.

## Plan shape

The U in the drawing is the Historic England listing, not the OSM outline:

- Seaward wall about **91 m**
- Landward opening about **168 m**
- Beach-to-sea sides about **137 m**

North wall, east wall, west wall. The south side is open beach. Thickness on the page is exaggerated so the line can be read. Crest height on that line is the working 3.5 m until someone levels the side walls.

Code: `lib/geography.ts`. The plan and the section read the crest and this polyline from there.
