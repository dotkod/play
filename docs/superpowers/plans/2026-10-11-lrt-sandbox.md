# LRT Immersive Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 3-stop immersive LRT sandbox at `/?lrt=1` without changing the live city.

**Architecture:** Plan-driven module under `src/lrt/` (plan → kit → sim → components), gated from hub like retired `?city=v2`. Continuous ride: player attaches to the shuttle car.

**Tech Stack:** Next.js 16, React Three Fiber, Vitest, existing `mergeParts` / `spendMoney` / hub controls.

## Global Constraints

- Never type world coordinates into React components; all placement from `src/lrt/plan`.
- No drei `<Html>`; DOM HUD overlays only.
- BM + EN string tables; parody LRT Laluan Kelana; no em dashes in player copy.
- React Compiler rules: sim as module singleton; no setState in effects for sim.
- Live `src/city` plan unchanged in this phase.
- Fare 120 sen; stations utara / pusat / selatan.

---

## File map

| Path | Role |
|---|---|
| `src/lrt/plan/*` | Path, stations, colliders, SPAWN |
| `src/lrt/kit/*` | Station, guideway, train, gate models |
| `src/lrt/sim/shuttle.ts` | Shuttle lifecycle + attach helpers |
| `src/lrt/components/*` | World, ground, stations, train, player, HUD |
| `src/hub/hub.tsx` | `?lrt=1` gate |
| `src/hub/strings.ts` | Immersive LRT copy |
| `src/hub/meta.ts` + `CHANGELOG.md` | Version bump |

---

### Task 1: Plan data + tests

- [ ] Create `src/lrt/plan/constants.ts`, `path.ts`, `stations.ts`, `colliders.ts`, `index.ts`
- [ ] Test: 3 stations ordered on path; SPAWN outside pusat; path length > 0
- [ ] Run `pnpm exec vitest run src/lrt/plan`

### Task 2: Shuttle sim + tests

- [ ] Create `src/lrt/sim/shuttle.ts` with approach/dwell/cruise and door state
- [ ] Test: doors closed while moving; round trip visits all stops
- [ ] Run `pnpm exec vitest run src/lrt/sim`

### Task 3: Kit models

- [ ] `station.ts`, `guideway.ts`, `train.ts`, `gate.ts` using `cachedParts` / `mergeParts` from city kit

### Task 4: Sandbox world + player

- [ ] Components: ground, stations, train mesh, elevated player, HUD, world Canvas
- [ ] TnG interact → `spendMoney`; attach while riding

### Task 5: Hub gate + strings + version

- [ ] `/?lrt=1` mounts sandbox; strings BM/EN; meta + changelog
- [ ] `pnpm exec tsc --noEmit && pnpm lint && pnpm check:layout && pnpm build`
