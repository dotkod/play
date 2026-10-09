# Phase 2 Design: World Architecture + Taman Ceria

**Status:** approved (full Phase 2; Approach 1 migrate to `src/world/`; Taman Ceria only; walk + bus; no more design Q&A)  
**Done when:** Pusat Lepak + Taman Ceria playable; walk the connector or take the bus; streaming holds 30+ fps on a mid-range phone; Hari Pertama step 6 completes at home sofa; perf overlay + day/night; CHANGELOG + version bump.

## Decisions

- Full Phase 2 checklist from `docs/KUALA_LEPAK.md` §13.
- Architecture Approach 1: greenfield `src/world/`; hub keeps UI only.
- Second district = **Taman Ceria** (terrace houses, playground, home sofa). KLCC → Phase 3.
- Travel: **walk** the connector road (streaming) **and** **bus** cutscene from Pusat bus stop ↔ Taman bus stop.
- Game clock: player's real local time; lighting presets pagi / tengah hari / petang / malam. No weather.
- Profile save: `{ districtId, x, z }` (plus existing fields). On load, stream that district first.
- Perf overlay: `?perf=1` (draw calls, tris, textures, fps via `gl.info`).
- Chunk size 64 × 64 m; load player chunk + neighbours (radius 1); far chunks = impostor boxes.
- Road graph shared by traffic, NPC pathing, buses, minimap.
- Out of scope: KLCC, weather, full LRT rides, new mini-games, facade atlas perfection (basic atlas OK).

## Package split

| Keep `src/hub/` | New / migrate `src/world/` |
|---|---|
| `hub.tsx`, phone, HUD, dialogue, controls, strings, meta, minimap UI | Road graph, ChunkManager, districts, traffic/NPC sim, lighting, colliders/spatial hash, impostors, instancing |

Hub mounts `<WorldRuntime />` from `@/world`. District code is lazy-loaded.

```
src/world/
  index.ts                 // WorldRuntime export
  chunk-manager.ts         // load/unload + impostors
  road-graph.ts            // types + queries (nearest lane, path)
  lighting.ts              // clock + presets
  colliders.ts             // spatial hash (from hub)
  traffic.ts               // graph-driven vehicles (from hub)
  npcs.ts                  // pedestrians on sidewalks/graph
  player-bridge.ts         // shared player pose for sim
  perf-overlay.tsx         // ?perf=1
  districts/
    pusat-lepak/
      meta.ts              // id, bounds, neighbours
      layout.ts            // buildings, props, spawns, graph slice
      scene.tsx            // React scene for loaded chunks
      index.ts             // lazy load()
    taman-ceria/
      meta.ts
      layout.ts
      scene.tsx
      index.ts
    registry.ts            // district id → loader
```

## Road graph

- **Node:** intersection id, `{x,z}`, signal controller optional.
- **Edge (lane):** from→to, polyline points, width, speed, left-hand traffic, sidewalk flag optional.
- Pusat Lepak: replace hard-coded ±EXTENT cross with explicit graph matching current layout.
- Connector: one road edge linking Pusat east/south edge to Taman Ceria entry.
- Traffic lights: per-intersection cycle (reuse current 18s timing).
- NPC/vehicle only simulate on edges whose chunks are loaded; distant = instanced fake traffic.

## Streaming

- World continuous coordinates; each district has `origin` offset in world space.
- ChunkManager tracks `playerChunk`; loads `radius ≤ 1`; unloads beyond; shows impostors for known far chunks (building AABB boxes from layout).
- Crossing district border does not teleport — walk continues; new district modules load.
- Bus ride: 2–3s overlay (fade + simple bus interior or exterior pass) → set position to destination stop → ensure destination district loaded → fade in.

## Taman Ceria (content bar)

- ~2–3 chunks: terrace row, small playground, surau silhouette optional, bus stop, **home** building with interactable sofa (sit prompt → crouch/sit pose, completes HP-6).
- Named NPC stub optional (neighbour wave); not required for Done.
- Hari Pertama `hp-6-bus-stub` → real task: take bus (or walk) to Taman Ceria + sit on home sofa.

## Day / night

- Module clock `gameTime` (0–1 day fraction), advanced in `useFrame` when city active.
- Presets swap hemisphere + sun intensity/colour + fog/background; building window emissives on at malam.
- Small clock chip on HUD (optional) or read-only in phone Tetapan — prefer HUD chip `HH:MM` game time.

## Batching (pragmatic)

- InstancedMesh: trees, street lamps, terrace repeats in Taman.
- Merge static sidewalk/road kerbs per chunk where easy.
- Facade atlas: single canvas atlas for shophouse window bands if time; else shared materials first.
- Hero outlines stay; merged chunks skip per-mesh outlines.

## Profile / events

- `profile.position: { districtId, x, z } | null` — write periodically + on bus arrive + on pause/hide.
- Events: `enteredDistrict`, `tookBus`, `satHome` for task engine.
- Places: `taman-ceria-home`, `taman-ceria-bus`, keep `bus-stop`.

## Acceptance

1. Fresh player can finish Hari Pertama through sofa sit (~12 min).
2. Walk Pusat → Taman without black loading hole; fps ≥ 30 at junction + Taman playground on mid phone profile (shadows may auto-drop via existing PerformanceMonitor).
3. `?perf=1` shows overlay.
4. Day cycle visibly changes lighting within a few real minutes.
5. `pnpm exec tsc --noEmit && pnpm lint && pnpm build` green.

## Implementation order

1. Scaffold `src/world/` + road graph types + Pusat graph data  
2. Migrate layout/colliders/player bridge; hub still one scene  
3. ChunkManager + impostors (single district first)  
4. Traffic/NPC on graph  
5. Day/night + HUD clock + perf overlay  
6. Instancing pass on repeated props  
7. Taman Ceria district + connector walk  
8. Bus ride + HP-6 rewrite  
9. Position save + verify  

---

*Defaults chosen without further Q&A per user request.*
