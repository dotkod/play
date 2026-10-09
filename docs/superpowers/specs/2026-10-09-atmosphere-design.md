# Atmosphere (weather + jerebu) v1

## Goal
Live Kuala Lumpur weather (Open-Meteo) and haze from AQI (WAQI), layered on existing day/night lighting. Atmosphere only — no umbrella AI.

## APIs
- Open-Meteo current weather for KL `3.139, 101.687` (no key)
- WAQI `feed/geo:3.139;101.687/` with `WAQI_TOKEN` server env
- `GET /api/atmosphere` caches ~12 min; client polls on hub start + interval

## Effects
- Fog/sun/bg tint: rain cools + shortens fog; haze browns + shortens more
- Rain particle system around player when raining/storm
- HUD chip under clock: AQI + weather word (BM/EN)

## Plane polish
- Banner biplane lower (~14–16m) and tighter oval so follow cam can see it

## Non-goals
- NPC umbrellas, walk slowdown, seasonal events, client-side API keys
