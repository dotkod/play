# LRT platform look + collision (sandbox)

**Status:** done  
 
 
**Done when:** `/?lrt=1` platforms read as Rapid-KL-ish elevated side platforms (tactile edge, PSD run, shelter, furniture) and the player cannot fall off the deck or walk through closed screen doors; tests + `tsc && lint` green.

Sandbox-only. Plan-driven. No drei `<Html>`. No city wiring.

## Goals

- Platform deck feels like an LRT stop, not a bare slab
- Solid collision: track edge, deck ends, south back-rail, benches/bins
- One shared `PLAT_EDGE_Z` (kill hardcoded `TRACK_Z + 1.6` drift)

## Locked choices (approach C)

| In | Out |
|---|---|
| Yellow tactile / safety strip on track edge | Twin track / opposite platform |
| Full-length PSD glass + framed door bay + header | Multi-car independent door bays |
| Platform benches + bins (south/back, clear of boarding) | Ticket machines, staff booth |
| Banded / slightly pitched elevated shelter | Vaulted KJ-accurate roof |
| South + E/W end rails (mesh + colliders) | Moving lift / escalator |
| Plan furniture rects → static colliders | City integration |

## Plan

### Constants (`src/lrt/plan/constants.ts`)

- Add `PLAT_EDGE_Z = TRACK_Z + 1.6` (track-side platform edge).
- Keep `PLATFORM_DEPTH`, `PLATFORM_ALONG`, `DOOR_HALF` as today.
- Optionally `PLAT_BACK_Z = PLAT_EDGE_Z + PLATFORM_DEPTH` for readability (or keep derived).

### Station builder (`src/lrt/plan/stations.ts`)

- Replace every `TRACK_Z + 1.6` / local `1.6` with `PLAT_EDGE_Z`.
- Add `furniture: Rect[]` per station — bench + bin footprints on the **south** half of the platform (back from track), inset from ends and from the boarding strip (~1.2 m clear of `PLAT_EDGE_Z`).
- `floorYAt` boarding apron uses `PLAT_EDGE_Z`.

### Colliders (`src/lrt/plan/colliders.ts` + `sim/shuttle.ts`)

Static (rebuild `STATIC_COLLIDERS`):

| Id pattern | Purpose |
|---|---|
| `*-wall-w/e` | Keep (use `PLAT_EDGE_Z`) |
| `*-plat-end-w/e` | Short rails at platform west/east ends (block walk-off along ±x) |
| `*-plat-back` | South back-rail along platform (and paid strip if needed) so player cannot walk off south edge into void |
| `*-furn-*` | One box per `furniture` rect |
| entry flap / stairs / service | Unchanged |

Dynamic (per frame, `platformEdgeColliders`):

- Closed: one solid strip `x ∈ [st.x ± half]`, `z ∈ [PLAT_EDGE_Z - 0.25, PLAT_EDGE_Z + 0.15]`
- Open (dwell + doors at this stop): split west/east around `DOOR_HALF` (same as today)
- All z refs use `PLAT_EDGE_Z`

No change to train door-gap / attach rules.

## Kit / look

### Platform deck (`kit/station.ts`)

- Deck slab kept; add **yellow tactile strip** (~0.4 m deep) along `PLAT_EDGE_Z` full `PLATFORM_ALONG`.
- Subtle darker **boarding strip** just behind tactile (optional thin band).
- **South + end railings**: metal posts + top rail (~1.1 m), matching collider lines.
- **Benches + bins** on south side of deck (from plan furniture centres, or mirrored layout at fixed offsets from `stX` — offsets from plan only).
- **Shelter**: keep columns; upgrade roof to a shallow pitched / double-band slab (red outer + cream/concrete inner), slight overhang past track edge and concourse.

### PSD (`kit/platform-doors.ts` + `components/stations.tsx`)

- Full-length side glass left/right of door bay (already roughly this — thicken frames, add mid posts every ~4 m for “run” read).
- Door bay: two sliding leafs (keep anim), add **header signage bar** above bay (dark + thin red).
- Leaf height ~1.6–1.8 m so it reads as half-height Rapid screens, not a floating pane.
- Cache key bump on mesh change.

### Layers (no z-fight)

| Element | Notes |
|---|---|
| Deck top | `PLATFORM_Y` |
| Tactile | Deck top + epsilon / separate thin box above deck |
| Rail posts | On deck, clear of tactile |
| PSD glass | At `PLAT_EDGE_Z`, base on deck |
| Furniture | On deck, south of boarding clear zone |

## Tests

- `plan.test.ts`: `PLAT_EDGE_Z` used; furniture rects on platform and outside door bay clear zone; spawn still on street.
- `platform-doors.test.ts`: closed = full edge solid; open = gap only within `DOOR_HALF` at dwelling station; other stations stay sealed.
- Existing shuttle / eta tests stay green.

## Success criteria

1. From platform, tactile edge + PSD run + benches readable in one glance.
2. Closed doors: cannot walk onto guideway; open: only through door bay.
3. Cannot walk off south or end of platform deck.
4. `pnpm exec tsc --noEmit && pnpm lint && pnpm exec vitest run src/lrt` green.
5. Version bump + `CHANGELOG.md` entry (player-facing).

## Files (expected touch)

- `src/lrt/plan/constants.ts`, `stations.ts`, `colliders.ts`, `plan.test.ts`
- `src/lrt/sim/shuttle.ts`, `platform-doors.test.ts`
- `src/lrt/kit/station.ts`, `platform-doors.ts`
- `src/lrt/components/stations.tsx` (cache keys / PSD mount if needed)
- `src/hub/meta.ts`, `CHANGELOG.md`
