# Banner biplane (sky ads) — design

## Goal
A low-poly biplane tows a waving banner over the city. Rotate in-world joke ads and one sponsor placeholder. Scenery first; tap hook for a later “Iklan” sheet.

## Non-goals (v1)
- Real ad network / billing
- Tap UI / deep links
- Multiple planes

## Behaviour
- One plane on a wide oval (~Pusat → Petaling → KLCC approach), altitude ~28–32m
- Ad rotates every ~45s from `src/content/ads/banner-plane.ts`
- Banner texture: module-cached canvas, rebuild only on ad change
- Sim state outside React; `useFrame` drives path + prop + wave
- Invisible banner hit mesh + `setBannerPlaneTapHandler` stub (no UI yet)

## Visual
- Red/white toon biplane (Box/Cyl), spinning prop, two tow lines
- White/colored banner with sine-wave mesh
