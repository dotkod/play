# LRT City Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed 3 compressed LRT stations + shuttle into live Pusat city with sandbox fare/auto-walk gameplay.

**Architecture:** Compress `src/lrt/plan` path into city bounds; merge LRT colliders into city plan; mount LRT meshes/shuttle in `CityWorld`; extend `CityPlayer` with elevated floorY + fare script; shared dest-picker HUD.

**Tech Stack:** TypeScript, R3F, existing `src/lrt` kit/sim/fare, city plan tests.

## Global Constraints

- Plan-driven (CITY_V2); no hand coords in components
- 3 stations; fare 120/200 sen by hops; auto gate→board→exit
- `pnpm check:layout` + tsc + lint green
- Spec: `docs/superpowers/specs/2026-10-11-lrt-city-integration-design.md`

---

### Task 1: Compress LRT plan for city bounds

**Files:** `src/lrt/plan/constants.ts`, `path.ts`, plan tests

- [x] `STATION_GAP` → ~70; path within ≈ ±95 m; `TRACK_Z` → city alignment (~-90)
- [x] Tests: stations inside city-ish bounds; spacing; floorY apron

### Task 2: Merge LRT colliders into city plan

**Files:** `src/city/plan/index.ts`, `colliders.ts` or `lrt.ts`, layout tests

- [x] Export/append `STATIC_COLLIDERS` from LRT into `COLLIDERS`
- [x] `check:layout` green (fix pillar/lot overlaps in plan)

### Task 3: Mount LRT in CityWorld

**Files:** `src/city/components/world.tsx`, thin wrappers if needed

- [x] `LrtShuttleTick`, `LrtStations`, `LrtTrain` in city canvas

### Task 4: CityPlayer + fare script

**Files:** `src/city/components/player.tsx`, reuse `src/lrt/components/fare.ts` etc.

- [x] `floorYAt` / cover; dynamic PSD+train colliders; scripted phases
- [x] Zone/Anne Maju still work when not on LRT

### Task 5: Dest picker HUD in hub

**Files:** extract picker, `hub.tsx` / city HUD

- [x] Show when `fare.ui === "destPick"` in city mode

### Task 6: Verify + changelog

- [x] tsc, lint, vitest lrt, check:layout, build
- [x] Version + CHANGELOG; mark spec done
