# Phase 4b Design: RapidLepak bus routes + ETAs

**Status:** approved (user: A → polish board → yes go)  
**Done when:** B101/B202 on board with live ETA + RM1 fare; BAS pole shows next arrivals; version 0.9.0.

## Routes

- **B101** (east/north): Pusat → Taman → KLCC → TLX → Petaling → (loop)
- **B202** (west/south): Pusat → Menara → Kampung → Pasar → Bukit Jalan → Bintik → Sentral → (loop)

## Behaviour

- ETA from real local minutes, cycling per route (deterministic).
- Board grouped by route; flat fare RM1.00 via `spendMoney`.
- Teleport ride overlay unchanged.
- Outer stops: return to Pusat with route + ETA on the action label.
- BAS blade sign texture updated with next two arrivals (no drei Html).
