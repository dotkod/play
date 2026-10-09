# LRT Laluan Kelana Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full LRT Laluan Kelana fast-travel via overlay board + ride (Phase 4a).

**Architecture:** Station table in content; hub proximity + board/ride overlays mirroring bus; Pusat door becomes live LRT; stub meshes in other districts; fare via `spendMoney`.

**Tech Stack:** Next.js / R3F existing hub patterns.

### Task 1: Transit data + events + strings
- Add `src/content/transit/lrt-kelana.ts`
- Extend `events.ts` with `tookLrt`
- Strings for board/ride/enter

### Task 2: LRT board + ride overlays
- `src/hub/lrt-board.tsx`, `src/hub/lrt-ride.tsx` (teleport + emit)

### Task 3: Stations in world
- Pusat building: `lrt: true`, drop `soon`
- Zones include `lrt`
- Stub station groups in KLCC / Kampung / Sentral / Taman scenes
- Places for each station

### Task 4: Hub wire + map + daily + ship
- Hub: nearLrt, board, ride, fare, UI
- Map markers; daily LRT task; version 0.8.0; CHANGELOG; Phase 4 checkbox
- Verify: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`
