# Kuala Lepak city (v2): rules for changing it

Read this before touching anything under `src/city`, the hub, or Anne Maju's room. The old
city broke because things were placed by hand in many files (buildings in scenes, colliders
in other lists, the map drawn separately), so they drifted apart and overlapped. v2 fixes that
with **one plan that everything is derived from**, plus tests that fail the build when the
layout is wrong. Keep it that way.

> **Golden rule:** never type a world coordinate into a component. If something has a
> position, it comes from `src/city/plan`. Rendering, collisions, the minimap, the big map,
> traffic and the tests all read the same plan, so they can't disagree.

---

## 1. Coordinates

- Metres. `x` = east, `z` = **south**, `y` = up. So **north is `-z`**.
- `rotY` follows three.js: a model's local `+z` faces `(sin rotY, cos rotY)`.
  `rotY = 0` faces south, `Math.PI` faces north, `Math.PI / 2` faces east.
- Malaysia drives on the **left**. `leftOf(dir) = { x: dir.z, z: -dir.x }` (in `plan/props.ts`).
  An east-bound lane is on the north half of the road.

## 2. Where things live

```
src/city/
  plan/            PURE data, no React/three. Tested in node.
    grid.ts        Constants + makeGrid(): road lines, junctions, segments, blocks, sidewalks, bounds, STREET_NAMES
    lots.ts        What stands on each block (shophouse rows, office, mall, park, Anne Maju)
    props.ts       Lamps, trees, benches, bins, planters, bus stop, fountain, playground,
                   road markings, paved surfaces, traffic-light poles
    lanes.ts       Traffic lanes (left-hand), turn curves, STOP_BACK
    colliders.ts   Collision boxes/circles generated from buildings + props + signals
    mamak.ts       Where Anne Maju's room sits inside its building, and its colliders
    index.ts       Builds the city: GRID, BUILDINGS, BLOCK_KINDS, STREETS, COLLIDERS, LANES, SPAWN
    *.test.ts      Overlap / reachability tests
  kit/             Model + texture builders (three, no React state)
    merge.ts       Part (box/cyl/ball) → ONE merged mesh + ONE outline mesh; shared materials
    buildings.ts   shophouseParts / mamakParts / officeParts / mallParts (one design language)
    props.ts       Street furniture models (built at the origin, +z = front)
    vehicles.ts    Cars, LALAMOOV van, delivery bikes; VEHICLE_SIZE; parody BRANDS
    textures.ts    Cached canvas textures (tiles, asphalt, grass, signs, labels)
  sim/             PURE simulations, tested in node
    traffic.ts     Signals, lane following, junction reservations, yielding, braking for people
    peds.ts        Pedestrians on sidewalk loops
  components/      React Three Fiber + DOM
    world.tsx      The <Canvas>: lighting, ground, buildings, props, traffic, peds, room, player
    ground.tsx     Grass, asphalt, sidewalks, kerbs, plazas, lanes, paths, road paint
    buildings.tsx  Merged building groups, row sign strips, cutaway fade, door marker
    props.tsx      Instanced props + traffic-light bulbs + lamp light pools
    traffic.tsx    Vehicle meshes driven by sim/traffic
    pedestrians.tsx
    player.tsx     Movement, collision, follow camera, job camera shots
    mamak-room.tsx Anne Maju's room inside the city (idle, or live via the tunnel)
    camera-override.ts  `cityCamera.shot`: a job takes the camera
    minimap.tsx, city-map.tsx, dynamic.ts, lighting.tsx
```

`src/world/` now only holds `lighting.ts` (clock, presets, `lampsOn`), `atmosphere.ts` (live
weather/haze) and `player-bridge.ts` (shared player position, teleport). Don't add city
layout there.

## 3. The grid (change sizes here, and only here)

| Constant | Value | Meaning |
|---|---|---|
| `LANE_W` | 3.5 | one traffic lane |
| `ROAD_HALF` | 4 | half the road width (2 lanes + shoulder) |
| `WALK_W` | 4.5 | sidewalk, kerb to building line |
| `BLOCK` | 33 | buildable square inside each block |
| `PITCH` | 50 | road line to road line (`BLOCK + 2 × (ROAD_HALF + WALK_W)`) |
| `MARGIN` | 14 | grass beyond the outer sidewalk |

`makeGrid(3, 3)` → road lines at x/z = -75, -25, 25, 75. Inner 4-way junctions get signals,
zebras and stop lines; edges are tees, corners are bends.

**To make the city bigger:** change `makeGrid(nx, nz)` in `plan/index.ts` and add the new
block ids to the block-kind map there. Everything else follows. (Before going far past ~5×5,
add chunked rendering: see §11.)

## 4. Adding things

### A building
1. Decide the block kind in `plan/index.ts` (`shophouse`, `office`, `mall`, `park`), or add a
   new kind in `lots.ts`.
2. Buildings are cut **from the block lot** (`block.lot`), never from sidewalks or roads.
   Shophouse rows are `ROW_DEPTH` (13 m) deep with a 7 m service lane between them; the front
   `ARCADE` (2.4 m) is the walkable five-foot way.
3. Model it in `kit/buildings.ts` using the `frame(b)` helper (`u` along the frontage, `v`
   inward from the front line, `y` up). Never use world coordinates inside a model function.
4. Colliders are generated automatically (`buildingWalls` + arcade pillars). Don't add
   collider lists elsewhere.
5. Shop names: `SHOP_NAMES` in `lots.ts`. Parody names only. **No religious buildings**
   (there is a test for this).

### A walk-in building (like Anne Maju)
Follow `plan/mamak.ts`:
- `arcade: 0`, model an **open shell** (side walls, kitchen block, upper floors, no ground-floor box).
- A room frame (`roomFrame`) places the interior; `roomRect` is the walkable inside;
  `roomColliders` + `backBlock` replace the normal wall collider.
- Interior furniture positions come from one shared layout module (for Anne Maju:
  `src/games/anne-maju/layout.ts`) used by the 3D room, the city colliders and the camera.
- The door mat (`b.door`) must be **outside** any collider (tests check this).

### A street prop
1. Add the kind to `PropKind` and its footprint to `PROP_SIZE` in `plan/props.ts`
   (`r` set = circle collider, otherwise a box).
2. Place it in `planStreets()` (kerb band for street furniture, or inside a block lot).
3. Add its model to `kit/props.ts` (`PROP_MODELS`); `components/props.tsx` instances it.
4. Run `pnpm check:layout`. Props must stay off asphalt, clear of walls, zebras and each other,
   and pedestrian lanes must stay clear.

### A vehicle type
- Add size to `VEHICLE_SIZE` and a parts builder in `kit/vehicles.ts`. Use `chassis()` so
  tyres sit in **wheel wells** (no tyre may intersect the body; `kit/vehicles.test.ts`).
- Brands are parodies only: GRAP, SHOPI, foodpandai, LALAMOOV.
- Spawning/mix lives in `createTraffic()` in `sim/traffic.ts`.

## 5. Traffic rules (sim/traffic.ts)

- Vehicles only exist inside the simulation. Never animate a car by hand in a component.
- Junctions are **reserved** ~10 m before entry; cross-axis traffic never shares a box;
  right turns never share a box with oncoming traffic; tees/corners take one approach at a time.
- Red/amber: stop at the stop line unless already committed (too close to stop).
- The deadlock breaker ("ghost") only applies to a vehicle **already inside a junction**.
  Never make vehicles ghost while queuing (that was a past bug: cars drove into each other).
- Vehicles brake (and honk) for the player and pedestrians.
- `sim/traffic.test.ts` runs 4 seeds × 30 vehicles × 3 minutes and fails on any body overlap,
  any red-light run, or gridlock. Any traffic change must keep it green.

## 6. Pedestrians (sim/peds.ts)

- Walk loops around each block at `PED_PATH` (2.5 m) from the building line, two directions on
  either side (`PED_SIDE` 0.45 m), keeping left.
- Slower walker ahead: match their pace (no stop-start jitter). Player in the way: wait.
- `sim/peds.test.ts` checks both lanes stay on sidewalk and clear of every collider. If you
  move a kerb prop or the bus stop, run it.

## 7. Visual rules that prevent glitches

**No coplanar faces.** Two surfaces at the same height/plane flicker (z-fighting). Ground layers
have fixed heights; keep to them:

| y | Layer |
|---|---|
| 0 | world grass |
| 0.01 | asphalt |
| 0.025 | road paint (dashes, edges, stop lines, zebras) |
| 0.04 | park grass |
| 0.045 | plazas, service lanes, arcade floors |
| 0.05 | sidewalks (kerb stones up to 0.14) |
| 0.055 | park paths |
| 0.06 | Anne Maju room floor |
| 0.07–0.08 | lamp light pools, door/player rings |

Inside models: a roof deck starts **behind** the parapet (`PARAPET_D`), water sits **above** a
basin rim, glass sits slightly in front of a wall. If two parts would share a face, offset one.

**Merged parts must not visibly intersect.** Each part gets an ink outline; intersecting parts
show outline lines cutting through each other (e.g. tyres through a car body). Leave a gap or
build wells.

**Fade, never vanish.** Buildings between the camera and the player fade
(`components/buildings.tsx`, using the ray's height where it *leaves* the footprint). The
follow camera rises over shophouse roofs and pulls in under towers, so it is never inside a
building (`components/player.tsx`).

**Lights:** street lamps use `lampsOn()` (18:30 to 07:00); lit windows use the night preset.
Weather can tint but never black out the scene (`lightModFor` floors).

## 8. Performance rules

- One merged mesh + one outline mesh per building row/tower/vehicle model (`kit/merge.ts`).
  Identical models share geometry (`cachedParts`).
- Street props are **instanced** (one draw call per model for the whole city).
- Ground layers are single merged meshes with world-space UVs.
- Canvas textures are created once and cached at module level (`kit/textures.ts`).
- No allocations in `useFrame` hot paths; reuse vectors.
- Never use drei `<Html>` (crashes React 19 on unmount); project DOM overlays instead
  (see `Projector` in `games/anne-maju/scene/mamak-scene.tsx`).

## 9. React / lint rules (React Compiler is strict)

- Simulations are **module singletons** (`getFleet()`, `getCrowd()`), mutated in `useFrame`.
  Don't keep mutable sim state in `useMemo`/`useState`.
- In `useFrame` use `state.camera` if you assign camera properties (fov etc.); don't mutate the
  camera from `useThree()`.
- Don't read refs during render, don't call `setState` (or anything that updates the router)
  inside another state updater. Keep URL updates (`history.replaceState`) outside updaters.
- Measure DOM sizes in `useEffect` (refs later in the tree attach after child layout effects).

## 10. Jobs inside the city (the Anne Maju pattern)

- Walking into `roomRect` mounts the game in **seamless** mode (hub). No separate page, no
  backdrop, no exit buttons: you walk out. Mid-shift, the pause card has "Stop shift".
- The game renders its 3D room into the city canvas through `mamakTunnel` (tunnel-rat).
- It takes the camera by setting `cityCamera.shot` (position, look target, room fit, and the
  screen space its UI panel covers); clear it when the shift ends.
- While a shift runs the hub hides its HUD and disables walking (`onLiveChange`).
- Shop UI is built from `src/games/anne-maju/ui/` (Card, Btn, Chip, Tabs, ShiftCard, ShiftHud,
  PauseCard, ResultCard). Reuse these for future jobs.

## 11. Growing the city (next steps, in this order)

1. More block kinds (housing terrace, pasar, school) as new `BlockKind`s in `lots.ts`, each with
   its own model in `kit/` and props in `planStreets()`.
2. Bigger grid, then **chunked rendering** (mount far blocks as cheap impostors).
3. Districts as **separate grids** joined by a connector road: give `makeGrid` an origin offset
   and stitch lanes at the join. Add a test that every district's doors are reachable.
4. Re-add NPCs, tasks and transit **from plan data** (NPC spots on sidewalks/arcades, stops from
   `planStreets`), never with hand-typed coordinates.

## 12. Before you push (every time)

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm check:layout && pnpm build
```

- `pnpm build` also runs the tests, so a broken layout blocks the deploy.
- **If a layout test fails, fix the plan. Never loosen or delete a test to make it pass.**
- Bump `src/hub/meta.ts` (city) or the game's `meta.ts`, and add a `CHANGELOG.md` entry for
  player-facing changes. No em dashes in player-facing copy; every string in BM and EN.

## 13. Local testing helpers

- `KL_MEMORY_REDIS=1 pnpm dev` uses an in-memory Redis, so signups, logins and scores never
  touch the production database.
- Dev-only console hooks:
  - `__klTeleport(x, z, rotY)` jump the player
  - `__klClock.frozen = true; __klClock.dayFrac = 0.5` freeze time of day (0.875 = 21:00)
  - `__klView.yaw = Math.PI` turn the camera
  - `__klThree` the r3f state (camera, scene, size) for inspection
