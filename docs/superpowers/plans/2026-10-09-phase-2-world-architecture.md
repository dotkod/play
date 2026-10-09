# Phase 2 World Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the city into `src/world/` with a road graph, chunk streaming, day/night, and a second district (Taman Ceria) reachable by walk or bus, finishing Hari Pertama at the home sofa.

**Architecture:** Hub keeps UI; `WorldRuntime` owns Canvas + ChunkManager + graph-driven sim. Districts live under `src/world/districts/<id>/` with lazy `load()`. Continuous world coords; bus is a short overlay teleport that still goes through the loader.

**Tech Stack:** Next.js 16, React Three Fiber, Three.js, existing toon helpers, localStorage profile, no new deps unless BufferGeometryUtils already available via three/addons.

**Spec:** `docs/superpowers/specs/2026-10-09-phase-2-design.md`

## Global Constraints

- Read `docs/KUALA_LEPAK.md` §4 before 3D work (no drei Html; module-level textures; sim outside React; React Compiler lint).
- All player-facing copy BM + EN in string tables; parody names only; non-violent.
- Bump `src/hub/meta.ts` version and `CHANGELOG.md` for player-facing drops.
- Verify with `pnpm exec tsc --noEmit && pnpm lint && pnpm build` before claiming done.
- Do not commit unless user asks.

---

## File map

| Path | Role |
|---|---|
| `src/world/road-graph.ts` | Graph types + queries |
| `src/world/chunk-manager.ts` | Chunk keys, load set, impostor list |
| `src/world/lighting.ts` | Game clock + light presets |
| `src/world/player-bridge.ts` | Shared player + phone flags (from hub/traffic) |
| `src/world/colliders.ts` | Spatial hash (migrate hub) |
| `src/world/runtime.tsx` | Canvas shell replacing hub/world.tsx guts |
| `src/world/perf-overlay.tsx` | `?perf=1` DOM overlay |
| `src/world/districts/registry.ts` | id → meta + lazy load |
| `src/world/districts/pusat-lepak/*` | Migrated layout + scene |
| `src/world/districts/taman-ceria/*` | New district |
| `src/hub/world.tsx` | Thin re-export / wrapper to WorldRuntime |
| `src/core/profile.ts` | `position` field |
| `src/content/tasks/hari-pertama.ts` | HP-6 real objectives |
| `src/content/places.ts` | Taman places |

---

### Task 1: Road graph module + Pusat graph data

**Files:**
- Create: `src/world/road-graph.ts`
- Create: `src/world/districts/pusat-lepak/graph.ts`
- Create: `src/world/districts/pusat-lepak/meta.ts`

- [ ] Step 1: Add types `GraphNode`, `GraphEdge`, `RoadGraph` and helpers `chunkKey(x,z,size=64)`, `nearestEdge`, `signalFor(node, t)` (port 18s cycle from hub/traffic).
- [ ] Step 2: Encode current cross junction as graph (main x-road ±42, cross z-road ±42, centre intersection) matching `ROAD_HALF` / left-hand lanes.
- [ ] Step 3: Export `PUSAT_META = { id: "pusat-lepak", origin: {x:0,z:0}, chunkSize: 64 }`.
- [ ] Step 4: `pnpm exec tsc --noEmit` passes.

### Task 2: ChunkManager (pure)

**Files:**
- Create: `src/world/chunk-manager.ts`

- [ ] Step 1: Implement `desiredChunks(px,pz,radius,size)` → Set of `"ix,iz"`.
- [ ] Step 2: `ChunkManager` class/module with `sync(player)`, `loaded`, `impostors` (all known chunk AABBs minus loaded).
- [ ] Step 3: `tsc` passes.

### Task 3: Migrate layout constants into Pusat package

**Files:**
- Create: `src/world/districts/pusat-lepak/layout.ts` (move BUILDINGS, footprint, doorSpot, ROAD_HALF, etc.)
- Modify: `src/hub/world-data.ts` → re-export from world for compat
- Create: `src/world/districts/pusat-lepak/index.ts` lazy stub

- [ ] Step 1: Move data; hub re-exports so existing imports keep working.
- [ ] Step 2: `tsc && lint` green.

### Task 4: Player bridge + colliders under world

**Files:**
- Create: `src/world/player-bridge.ts` (player + PHONE_DRAW_MS)
- Create: `src/world/colliders.ts` (migrate + spatial hash bucket)
- Modify: hub imports to re-export from world

- [ ] Step 1: Move `player` object; update hub/player, hub/traffic, hub/world imports.
- [ ] Step 2: Spatial hash: insert static AABBs; `pushOut` queries nearby cells only.
- [ ] Step 3: `tsc && lint` green; city still playable.

### Task 5: WorldRuntime + ChunkManager wired (still one district)

**Files:**
- Create: `src/world/runtime.tsx`
- Modify: `src/hub/world.tsx` to render WorldRuntime
- Create: `src/world/districts/pusat-lepak/scene.tsx` (City + traffic lights initially)

- [ ] Step 1: Move Canvas/lights/City composition into runtime; hub/world becomes thin.
- [ ] Step 2: ChunkManager sync each frame from player; only mount scene chunks in loaded set (Pusat may be 1–4 chunks covering current extents).
- [ ] Step 3: Impostor boxes for unloaded known chunks (may be empty at first).
- [ ] Step 4: Verify in browser / `tsc && lint`.

### Task 6: Traffic + pedestrians on graph

**Files:**
- Modify: migrate `src/hub/traffic.tsx` → `src/world/traffic.tsx` (or keep hub file importing graph)
- Modify: `src/hub/npcs.tsx` pathing to follow sidewalk edges

- [ ] Step 1: Vehicles pick lane edges; stop at red via intersection signal.
- [ ] Step 2: Remove hard-coded EXTENT bounce in favour of graph endpoints / loops.
- [ ] Step 3: `tsc && lint`; smoke traffic.

### Task 7: Day/night + HUD clock

**Files:**
- Create: `src/world/lighting.ts`
- Modify: runtime sun/hemisphere/fog from preset
- Modify: `src/hub/hud.tsx` + strings for game-time chip

- [ ] Step 1: Clock advances when `active`; expose `getGameTime()`.
- [ ] Step 2: Four presets; malam window glow on buildings (simple emissive strips OK).
- [ ] Step 3: HUD shows game `HH:MM`.
- [ ] Step 4: Version bump patch + CHANGELOG note when player-visible.

### Task 8: Perf overlay

**Files:**
- Create: `src/world/perf-overlay.tsx`

- [ ] Step 1: If `searchParams` / `location.search` has `perf=1`, show fps + `gl.info.render` counts.
- [ ] Step 2: Update once / 500ms from useFrame counter (DOM, not drei Html).

### Task 9: Instancing pass

**Files:**
- Modify: city / Taman props

- [ ] Step 1: InstancedMesh for lamps/trees currently duplicated.
- [ ] Step 2: Confirm draw calls drop in perf overlay.

### Task 10: Taman Ceria district + walk connector

**Files:**
- Create: `src/world/districts/taman-ceria/{meta,layout,graph,scene,index}.ts(x)`
- Modify: registry, connector edges in graphs
- Modify: places, minimap bounds if needed

- [ ] Step 1: Place Taman origin so connector road links from Pusat (e.g. east +x).
- [ ] Step 2: Terrace row, playground, bus stop, home building + sofa interact zone.
- [ ] Step 3: Expand player BOUNDS / remove single-district clamp; use world bounds or soft walls.
- [ ] Step 4: Walk across; chunks stream; `tsc && lint`.

### Task 11: Bus ride + Hari Pertama 6

**Files:**
- Create: `src/hub/bus-ride.tsx` (DOM overlay)
- Modify: hub prompts at bus stops
- Modify: `src/content/tasks/hari-pertama.ts`, places, events, strings
- Modify: profile position persistence

- [ ] Step 1: Interact at bus → overlay 2–3s → spawn other stop; emit `tookBus`.
- [ ] Step 2: Sofa sit → emit `satHome`; HP-6 objectives `tookBus|goTo home` + sit.
- [ ] Step 3: Save `profile.position` on interval + after bus.
- [ ] Step 4: Full verify + CHANGELOG 0.4.0 (minor: new district).

### Task 12: Docs + roadmap checkboxes

**Files:**
- Modify: `docs/KUALA_LEPAK.md` Phase 2 checkboxes
- Modify: AGENTS.md only if needed

- [ ] Step 1: Mark Phase 2 items done that shipped; note KLCC still Phase 3.
- [ ] Step 2: Final `tsc && lint && build`.

---

## Risk notes

- Large migration: keep hub re-exports so intermediate commits stay green.
- Mobile fps: lean on existing PerformanceMonitor; impostors must be cheap boxes.
- React Compiler: no setState in useFrame; clock in module; HUD polls or subscribes sparsely.
