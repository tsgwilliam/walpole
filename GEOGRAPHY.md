# Walpole Bay tidal pool — working geography

Provisional lock for the drawings, 1 October 2026. Not a survey you should build to.

## Datum

Margate Chart Datum sits **2.50 m below** Ordnance Datum Newlyn.

**Height above Chart Datum = height above Ordnance Datum Newlyn + 2.50 m.**

That offset is the Margate row in the Port of London Authority tide booklets for 2024 and 2025. It matches Admiralty Tide Tables Table III / UKHO practice. A later look at the printed table can still confirm the line.

## Axes

Origin: the **middle of the seaward wall crest**, not the middle of the pool.

| Axis | Direction | Unit |
| --- | --- | --- |
| X | East | metres |
| Y | North | metres |
| Z | Up | metres above Chart Datum |

OSGB36 of that origin: **E 636913.0, N 171594.5**. Local **(0, 0, 3.50)**.

The easting and northing come from the EA 2020 terrain model: core crest samples whose northing is at least 171580. The measured mean of that core is about **3.46 m CD**. The working crest is **3.50 m**, give or take **0.2 m**. Horizontal uncertainty on the origin is about 2 m.

OSM outline (way 98464382): E 636831–637011, N 171436–171603. A pool centroid near E 636921, N 171519.5 is only a reference. The classic grid reference TR 3692 7151 is the site, and the crest is a little further north.

## Heights used by the app

| Thing | Value | Uncertainty | Where it comes from |
| --- | --- | --- | --- |
| Wall crest | **3.5 m CD** | ±0.2 m | Working round of a measured core mean of about 3.46 m. Replaces the old 4.0 m placeholder. |
| Overflow | **3.35 m CD** | ±0.25 m | Six inches (0.15 m) under the crest. The lidar crest sits about 0.15–0.22 m above the pool surface. |
| Chalk inside the pool | **1.4 m CD** | ±0.4 m | **Uncertain.** Crest minus about 2.1 m. Not seen in the 2020 lidar. |
| Lidar inside the pool | **3.27 m CD** | ±0.15 m | Held water, not the floor. |
| Foreshore north of the crest | **0.33 m CD** | ±0.25 m | A sample about 25 m north of the origin. |
| Soft beach | about **12%** over about **35 m** | about 11–15% | Inland of the south lip, then a hard step. |
| Promenade / cliff | about **18 m CD** | ±0.5 m | Context south of the soft beach. Not drawn as a tower. |

The crest at 3.5 m sits below mean high water neaps (3.9 m), which matches the listing: the wall goes under on every tide.

The section keeps a short beach and a flat floor. A 12% rise over 35 m, and the cliff at 18 m, would leave the frame. The ink is fitted to the page.

## Tide levels (Margate, Chart Datum)

Working set, aligned with Admiralty / UKHO. The PLA booklet is within about 0.1 m on some of these (it lists MHWN 4.0, MLWN 1.3, MLWS 0.6).

| Level | m CD |
| --- | --- |
| Highest astronomical tide | 5.1 |
| Mean high water springs | 4.8 |
| Mean high water neaps | 3.9 |
| Mean low water neaps | 1.4 |
| Mean low water springs | 0.5 |

## Plan shape

The U on the page is the Historic England listing, not the lidar bar:

- Seaward wall about **91 m**
- Landward opening about **168 m**
- Beach-to-sea sides about **137 m**

North wall, east wall, west wall. The south side is open beach. Thickness on the page is exaggerated. Crest height on that line is the working 3.5 m.

The measured seaward crest is a separate polyline in the module, about 102 m from end to end, with heights around 3.3–3.5 m. Side-wall positions in the point list are approximate. The ink U stays on the listing lengths.

## Locked points (local metres)

| Name | x | y | z CD | Note |
| --- | --- | --- | --- | --- |
| seaward_wall_crest_centre | 0 | 0 | 3.50 | Origin |
| seaward_wall_crest_west | −51 | −10 | 3.47 | West end of the measured bar |
| seaward_wall_crest_east | +51 | −13 | 3.47 | East end of the measured bar |
| west_wall_midpoint | −64 | −84.5 | 3.42 | Approximate |
| east_wall_midpoint | +81 | −94.5 | 3.42 | Approximate, noisier |
| beach_toe_south_lip | +7 | −158.5 | 3.30 | Open south lip |
| soft_beach_sample_near_lip | +7 | −164.5 | 3.36 | Soft beach |
| soft_beach_sample_mid | +7 | −174.5 | 3.94 | Soft beach |
| soft_beach_sample_upper | +7 | −184.5 | 6.67 | Toward the promenade |
| promenade_cliff_hint | +7 | −204.5 | 17.90 | Cliff context |
| promenade_cliff_top | +7 | −214.5 | 18.51 | Cliff context |
| inferred_chalk_floor_seaward | 0 | −30 | 1.40 | Uncertain |
| pool_lidar_water_surface | 0 | −40 | 3.27 | Water, not chalk |
| foreshore_north_of_crest | 0 | +25 | 0.33 | North of the wall |

Code: `lib/geography.ts`. The plan and the section read the working crest, and the ink wall line, from there.
