# Phase 4a Design: LRT Laluan Kelana

**Status:** approved (user: A → full line → overlay approach → go build)  
**Done when:** player can enter any of 5 stations, pick another stop, pay RM1.20, ride overlay, teleport to destination exit; map shows stations; version 0.8.0; `tsc && lint && build` green.

## Scope

| In | Out |
|---|---|
| Full red line: Pusat, KLCC, Kampung, Sentral, Taman | MRT, Monorel |
| Overlay board + ride cutscene (bus-pattern) | Full 3D walkable platforms at every stop |
| Fare RM1.20 from wallet | Touch ’n Go card / top-up UI |
| Pusat Stesen LRT door live; stub stations elsewhere | LRT Sardin job |
| Places, map markers, daily “naik LRT” | Rush-hour crowding |

## Stations

| Id | Exit near |
|---|---|
| `pusat-lepak` | Existing Stesen LRT door (`x≈-19`) |
| `klcc` | Park / bus strip |
| `kampung-lepak` | Kampung centre |
| `sentral-lepak` | Sentral hall |
| `taman-ceria` | Housing / bus |

## Flow

1. Near station door → Masuk stesen (E).
2. Board lists other 4 stops.
3. `spendMoney(120)`; fail → needMoney toast.
4. Overlay: train arriving → riding → teleport + `tookLrt` + `entered`.
5. Drop outside destination station facing the street.

## Tech

- `src/content/transit/lrt-kelana.ts` — station table + fare.
- `src/hub/lrt-board.tsx`, `src/hub/lrt-ride.tsx`.
- Building: Pusat `lrt: true` (not `soon`); zones include `lrt`.
- Other districts: small station mesh + hub proximity (like bus stops).
- Event: `tookLrt { to }`.
