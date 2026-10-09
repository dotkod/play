# Roadside billboards (ads)

Replaces the sky biplane (hard to see from follow cam).

## Behaviour
- 4 tall double-sided boards on arterial verges (Pusat E/W/S + Petaling)
- Shared ad list in `src/content/ads/billboards.ts` — jokes + `YOUR AD HERE`
- Staggered rotation (~45s, offset per board)
- `setBillboardTapHandler` stub for later Iklan UI
- Post colliders so players don’t walk through

## Non-goals
- Real ad network, tap sheet UI
