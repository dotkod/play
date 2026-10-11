# LRT immersive sandbox (3 stops)

**Status:** approved (plan UI)  
**Done when:** `/?lrt=1` lets the player walk street → TnG → platform → board a moving train → alight at another of 3 stops → exit; live city unchanged; tests + `tsc && lint && build` green.

## Scope

| In | Out |
|---|---|
| Separate sandbox world behind `?lrt=1` | Wiring into live Pusat 3×3 |
| 3 elevated stations on one guideway | 6–7 stops, MRT, bus, monorail |
| Walk-in stations, stairs, platforms | Full KL-accurate architecture |
| Touch n Lepak tap at entry gates (RM1.20 wallet) | Separate card balance / top-up UI |
| Real moving shuttle train; board through open doors | Cabin overlay / teleport ride |
| Continuous 3D ride (player attached to car) | LRT Sardin job, rush hour crowds |
| BM + EN strings, version + changelog | Peta fast-travel, district streaming |

## Locked choices

- **Stations:** `utara`, `pusat`, `selatan` (sandbox names).
- **Line:** LRT Laluan Kelana (red).
- **Service:** one shuttle, Utara ↔ Pusat ↔ Selatan and reverse.
- **Fare:** 120 sen on entry gate tap; free exit.
- **Spawn:** street outside Stesen Pusat.

## Player flow

1. Spawn on street south of Stesen Pusat.
2. Walk into station entrance → stairs up to concourse.
3. Near entry TnG → interact (E / Enter) → `spendMoney(120)` or `needMoney`.
4. Walk through open flap onto platform.
5. Shuttle arrives, doors open (~5 s dwell).
6. Walk into car; doors close; train moves with player attached.
7. At next stop, doors open; walk out → exit gates (free) → stairs → street.

## Architecture

```
src/lrt/
  plan/     path, stations, gates, platforms, colliders, SPAWN (pure)
  kit/      station, guideway, train, TnG gate (merged parts)
  sim/      getShuttle() approach / dwell / doors / cruise + attach
  components/  Canvas world, player (elevated floors), HUD
```

Hub: if `?lrt=1`, mount `<LrtSandbox />` instead of `<CityWorld />`.

## Plan geometry

- Guideway along **+x**, elevated deck ~8 m.
- Stations at x ≈ −140, 0, +140; side platform on +z.
- Train path = guideway centreline; sim samples by distance along path.
- Colliders from plan; train body is a moving box; door gaps walkable only while open.

## Sim rules

- Doors never open while speed > epsilon.
- Attach only if player is inside car AABB when doors close (or while cruising if already riding).
- While riding and moving: player world xz follows car + local offset; walk locked.
- Emit `tookLrt { to }` when alighting after a ride.

## Success criteria

- Full loop both directions across all 3 stops.
- Default `/` city untouched.
- `pnpm exec tsc --noEmit && pnpm lint && pnpm check:layout && pnpm build` green.
