# LRT Platform Enhance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rapid-KL-ish elevated platform look (tactile edge, PSD run, shelter, furniture) plus solid edge/back/end/furniture collision in the LRT sandbox.

**Architecture:** Plan owns `PLAT_EDGE_Z` + furniture rects; kit draws deck/rails/PSD/shelter from plan constants; static colliders rebuild from stations; `platformEdgeColliders` keeps open/closed door-bay logic on `PLAT_EDGE_Z`.

**Tech Stack:** TypeScript, R3F kit merge parts, vitest.

## Global Constraints

- Sandbox only (`/?lrt=1`); no city wiring
- No hand-typed world coords in components; no drei `<Html>`
- No coplanar z-fight (y-layer deck / tactile / rails)
- BM/EN strings unchanged unless new player copy
- Bump `meta.ts` + `CHANGELOG.md` for player-facing change
- Spec: `docs/superpowers/specs/2026-10-11-lrt-platform-enhance-design.md`

---

### Task 1: Constants + plan furniture + PLAT_EDGE_Z

**Files:** `src/lrt/plan/constants.ts`, `stations.ts`, `plan.test.ts`, `plan/index.ts` if needed

- [x] Add `PLAT_EDGE_Z = TRACK_Z + 1.6`
- [x] Replace hardcoded `1.6` / `TRACK_Z + 1.6` in `stations.ts` (`buildStation`, `floorYAt`)
- [x] Add `furniture: Rect[]` to `LrtStation` (benches/bins south of boarding clear zone)
- [x] Test: furniture on platform, clear of door bay strip; edge z === `PLAT_EDGE_Z`

### Task 2: Colliders

**Files:** `src/lrt/plan/colliders.ts`, `src/lrt/sim/shuttle.ts`, `platform-doors.test.ts`

- [x] Static: plat-end W/E, plat-back, furn-* from `st.furniture`; walls use `PLAT_EDGE_Z`
- [x] `platformEdgeColliders` uses `PLAT_EDGE_Z`
- [x] Tests still pass for open gap / sealed edge

### Task 3: Kit look — station body + roof

**Files:** `src/lrt/kit/station.ts`, `components/stations.tsx` (cache bump)

- [x] Yellow tactile strip, boarding band, south/end rails, platform benches/bins
- [x] Pitched/banded elevated roof
- [x] Cache `lrt-st-body-v5` / `lrt-st-roof-v5`

### Task 4: Kit look — PSD

**Files:** `src/lrt/kit/platform-doors.ts`, `components/stations.tsx`

- [x] Mid posts, taller screens, header bar with red cue
- [x] Use `PLAT_EDGE_Z`; cache bump `lrt-psd-sides-v2-*` / leaf

### Task 5: Verify + changelog

- [x] `pnpm exec tsc --noEmit && pnpm lint && pnpm exec vitest run src/lrt`
- [x] Version `0.14.5` + CHANGELOG bullet
- [x] Spec status → approved / done
