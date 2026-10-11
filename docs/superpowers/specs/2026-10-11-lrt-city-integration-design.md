# LRT into live city (Pusat 3×3)

**Status:** done  
**Done when:** default `/` (no `?lrt=1`) lets the player walk the city → enter any of 3 elevated LRT stations → pick destination → auto-walk board → ride → auto-exit at destination back onto city sidewalks; `pnpm check:layout` + `tsc && lint && build` green; version + changelog bumped.

Approach **C**: embed compressed guideway in `src/city/plan`; reuse `src/lrt` kit / sim / fare / scripted ride.

## Goals

- Live city has a real walkable elevated LRT (not overlay / teleport cutscene)
- Same gameplay as sandbox: destination picker, fare by hops, auto gate→train→exit
- Plan-driven placement (CITY_V2 golden rule); no hand-typed coords in components
- City traffic / Anne Maju / existing lots keep working

## Locked choices

| Choice | Value |
|---|---|
| Stations | 3 — `utara`, `pusat`, `selatan` (parody names; BM/EN strings) |
| Line | LRT Laluan Kelana (red `#c62f25`) |
| Service | One shuttle, Utara ↔ Pusat ↔ Selatan and reverse |
| Fare | 1 hop RM1.20 · 2 hops RM2.00 (reuse `fareSenBetween`) |
| Ride | Scripted auto-walk entry → board → seat → dest → exit (reuse phases) |
| Layout | Elevated guideway **along +x** (east–west) over the city, stations at west / centre / east |
| Sandbox | Keep `?lrt=1` working during integration; remove or redirect later (not blocking) |

## Out of scope

- Multi-district map, MRT/monorail/KTM
- LRT Sardin job, rush crowds, Kak Aini storyline
- Twin track / opposite platform
- Expanding grid past 3×3
- Replacing city traffic lanes under the guideway pillars (pillars dodge roads via plan)

## Geometry (compressed)

City bounds ≈ ±97.5 m (`makeGrid(3,3)`). Sandbox used ~360 m / 140 m gaps — **compress**:

| Metric | Sandbox | City (target) |
|---|---|---|
| Station spacing | 140 m | ~70–80 m along guideway |
| Path length | ~360 m | ~180–200 m (fits bounds + small margin) |
| Deck height | `DECK_Y` 8 / `PLATFORM_Y` 8.12 | Keep same elevated heights so kit reused |
| Platform depth / along | keep kit constants or slight shrink if lots collide | Prefer keep; adjust station footprint in plan if a lot overlaps |

**Guideway axis:** east–west at a fixed world `z` chosen in plan so:

- Pillars sit in block interiors or sidewalk margins where possible
- Street entrances (stairs / plaza) land on sidewalks, not mid-asphalt
- Anne Maju door and park stay clear

Exact `z` and station `x` are **plan constants** derived once (e.g. `src/city/plan/lrt.ts` or under `src/lrt/plan` with city import of path samples) — components only read the built plan.

**Station street access:** each station keeps sandbox-style stairs/plaza/gates, but plaza `street` rect must overlap city sidewalk / walkable space so the city player can reach TnG without falling through.

## Architecture

```
src/city/plan/
  lrt.ts          NEW — path samples, 3 stations in city coords, furniture, covers
  colliders.ts    MERGE — append LRT static boxes (walls, flaps, furniture, guide rails)
  index.ts        EXPORT — CITY_LRT / stations / path / floorY helpers or re-export from lrt plan

src/lrt/          REUSE — kit, sim/shuttle, fare, gate-state, train, stations mesh, cabin PID
  plan/           Either: city becomes source of truth and sandbox reads city lrt plan,
                  OR: shared pure module both import (prefer one source — city plan/lrt.ts)

src/city/components/
  world.tsx       Mount LrtStations + LrtTrain + shuttle tick (when city active)
  player.tsx      Elevated floorY + fare script + train attach (merge sandbox player logic)
```

Hub: default city always has LRT. `?lrt=1` may keep isolated sandbox for debugging until removed.

## Player / collision

City player today: `y = 0`, static `COLLIDERS` only.

Add:

1. `floorYAt(x,z)` — city ground `0`, else LRT street/stairs/platform/apron/`DECK_Y` (reuse sandbox logic against city stations).
2. Per-frame: `platformEdgeColliders()` + `trainColliders()` mixed into resolve (same as sandbox).
3. Fare phases: `toPlatform` / `waitBoard` / boarding / seated / alighting / `toExit` — module `fare` singleton shared.
4. While scripted or riding: disable free move stick (hub already patterns this for jobs).
5. Camera: reuse sandbox elevated follow / cabin FOV when `fare.riding`.

**Traffic:** vehicles stay on road lanes; guideway is above. Pillar colliders must not block lanes illegally — pillars as plan props with small footprints beside roads, or in lots. Run `pnpm check:layout` after placement; fix plan, don’t loosen tests.

## Fare / HUD

- Reuse destination picker UI (extract from `LrtSandbox` into a shared component mounted from hub/city HUD when `fare.ui === "destPick"`).
- Prompts / toasts via existing hub toast or a thin city LRT prompt strip (BM/EN in `src/lrt/strings` + hub wiring).
- Emit `tookLrt { to }` on successful destination arrival (already in sandbox player).

## Rendering

- Mount once: guideway + 3 station meshes + PSD + gates + name boards + PIDs + train.
- Roof fade when camera blocked (sandbox pattern) optional but nice.
- No drei `<Html>`; canvas textures for PID / name boards stay.

## Tests

- Plan: stations ordered west→east; street plazas reachable from SPAWN graph (or sidewalk reachability); no building/LRT solid overlap beyond allowed; path length within bounds.
- Fare: hop pricing unchanged.
- Shuttle / platform-doors tests: still green against city path length (retune dwell/speeds if needed).
- `pnpm check:layout` green.

## Success criteria

1. From SPAWN, player can walk to Stesen Pusat (or nearest), tap TnG, pick Utara or Selatan, auto-ride, exit onto sidewalk.
2. All 3 stations boardable both directions over a full shuttle cycle.
3. Anne Maju shift + city traffic still work.
4. Default `/` — no query flag required.
5. Version + `CHANGELOG.md` player-facing entry.

## Implementation order (hint for plan)

1. City plan `lrt.ts` + collider merge + layout tests  
2. Mount LRT visuals + shuttle in `CityWorld`  
3. City player: floorY + colliders + fare script  
4. Shared dest-picker HUD  
5. Polish / changelog / decide sandbox fate  

## Files (expected)

- `src/city/plan/lrt.ts` (new), `colliders.ts`, `index.ts`, plan tests  
- `src/city/components/world.tsx`, `player.tsx`  
- `src/lrt/**` — retarget plan imports to city or shared module; extract picker from sandbox  
- `src/hub/hub.tsx` / HUD — picker + prompts  
- `docs/KUALA_LEPAK.md` — mark city LRT live (small status note)  
- `meta.ts`, `CHANGELOG.md`
