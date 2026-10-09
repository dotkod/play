# Phase 3a Design: KLCC + Menara Berkembar

**Status:** approved (user: go next phase; KLCC was deferred from Phase 2)  
**Done when:** walk (and bus) from Pusat Lepak into a KLCC park strip with twin towers + skybridge + fountain; towers stay visible as impostors from Pusat; map/minimap show the district; CHANGELOG + version bump.

## Scope (this slice only)

Phase 3 is “one district per PR”. This PR = **KLCC**.

| In | Out |
|---|---|
| District `klcc` north of Pusat | Menara Lepak, TLX, stadium, etc. |
| Menara Berkembar (LOD: full near / block impostor far) | Real Petronas naming/logos |
| Park, fountain, path, bus stop | Fountain night show script |
| Walk connector + bus from Pusat | New mini-games |
| Places + optional daily “visit KLCC” | Full LRT ride |

Taman Ceria housing/sofa already shipped in 0.4.x → mark that Phase 3 bullet done.

## Layout

- Origin ≈ `(0, -100)` world XZ. Pusat cross ends ~`z=-42`; connector road along −z.
- Twin towers offset ±8 on X, park/fountain on centre, bus stop on east sidewalk of the strip.
- Chunks: register ix −1..1, iz −2..−1 (chunk size 64).

## Travel

- Walk north from Pusat past `z≈-45`.
- Bus: Pusat bus stop gains destination choice **or** second prompt “Bas → KLCC” when near stop (prefer: cycle/picker on one button — **Bas ke…** opens two options: Taman / KLCC). Return bus at `klcc-bus`.

## Tech

- Same `src/world/districts/klcc/` pattern as Taman.
- Tower mesh: stacked tapered boxes (star footprint approximated by rotated square pair), silver material, skybridge box at ~40% height.
- Far: keep a slim always-on impostor pair parented at world origin visibility when `player.z > -55` (or use ChunkManager impostors — tall `h`).
- Expand `WORLD_MIN_Z` to ~−130; map-draw paints KLCC road + park + tower icons.

## Acceptance

1. Reach KLCC on foot and by bus; return by bus.
2. Towers readable from Pusat skyline.
3. `tsc && lint && build` green; version **0.5.0**.
