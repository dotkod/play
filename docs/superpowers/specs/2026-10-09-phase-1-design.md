# Phase 1 Design: Phone, Story, Optional Cloud Account

**Status:** approved (story-first + Tetapan auth)  
**Done when:** a new guest can finish Hari Pertama steps 1–5 guided by the phone; optional `@user` + 8-digit PIN saves progress to Upstash and restores on another device.

## Decisions

- Full Phase 1 checklist from `docs/KUALA_LEPAK.md` §13.
- Approach: story-first; auth in Tetapan + soft prompt after first paid shift.
- Guest = `localStorage` only. Signed-in = same profile JSON in Redis.
- Username `@` + 5–20 `[a-z0-9_]`, unique. PIN = 8 digits, scrypt-hashed.
- Register merges guest progress into new cloud account.
- Makcik step uses tiny buy (nasi lemak) then give to Osman.
- Hari Pertama step 6 = coming-soon bus stub.
- Phone apps: Mesej, Tugasan, Dompet, Tetapan. Others greyed.

## Architecture

```
City systems ──emit──► events.ts ◄── TaskEngine / story kickoff
Profile (local) ◄──► optional PUT/GET /api/profile (cookie session)
Auth: /api/auth/{register,login,logout,me}
Content: src/content/{npcs,tasks,dialogue}
UI: hub/phone/*, dialogue box, named NPCs, waypoint on guide arrow
```

## Profile additions (v2)

- `username`, `updatedAt`
- `ledger: { id, at, amount, labelMs, labelEn }[]` (capped ~40)
- `inbox: { id, from, at, bodyMs, bodyEn, taskId?, read, accepted? }[]`
- `pinnedTask: string | null`
- existing tasks/inventory/flags/reputation

## Auth / Redis keys

- `kl:user:<username>` → `{ pinHash, salt, createdAt }`
- `kl:profile:<username>` → Profile JSON
- `kl:loginfail:<ip|user>` → rate limit counters
- Cookie `kl_session` httpOnly, signed HMAC, ~30d
- Env: `AUTH_SECRET` (fallback local-only secret in dev)

## Hari Pertama

1. Kak Yati messej → goTo `bus-stop`
2. Talk `uncle-raju` → playJob anne-maju any
3. Talk raju → playJob minEarned 1500 → +RM10 + apron
4. Talk makcik → buy nasi-lemak → give to `pakcik-osman`
5. Osman → petCats 3
6. Kak Yati bus message → stub “akan datang”

## World hooks

- Named NPCs: uncle-raju (Anne Maju door), makcik-kiah (stall), pakcik-osman (bus stop), ah-seng (runcit)
- Places: `bus-stop`, building ids, stall
- Priority prompts: door > NPC talk > buy > cat
- Waypoint module drives guide arrow + minimap dot
