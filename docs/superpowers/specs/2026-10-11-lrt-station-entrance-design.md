# LRT station entrance + name boards

Sandbox-only (`/?lrt=1`). Plan-driven shell + canvas name boards (approach 2).

## Goals

- Street + platform station name boards (BM/EN via `getLang`)
- Wider, Rapid-KL-like entrance: canopy, glass sides, lift + escalator boxes, handrails, plaza furniture
- No hand-typed world coords in components; no drei `<Html>`

## Plan

- Widen `street`, `stairs`, `concourse`; refresh `covers`
- Add `nameBoards: { x,y,z,rotY, kind: "street"|"platform" }[]`
- Colliders for lift/escalator masses + stair rails

## Kit

- Richer `stationBodyParts` / `stationRoofParts` (pavilion, glass, lift, escalator, rails, benches/bins)
- Cache key bump when mesh changes

## Name boards

- Module-level canvas texture per station (like PID)
- Street fascia wide; platform end boards smaller
- Line red stripe + station name

## Out of scope

- City integration, real Rapid branding, lifts that move
