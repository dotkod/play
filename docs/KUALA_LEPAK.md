# Kuala Lepak: Development Handbook & Roadmap

> **Hidup, kerja, lepak.**
> Kau baru pindah ke Kuala Lepak. Cari kerja, kenal orang, dan jangan lupa usap Oyen.

This is the single source of truth for continuing development of **Kuala Lepak**: a
non-violent, GTA-style open-world life game set in a stylised version of Kuala Lumpur.
It covers where the project is today, how the code is organised, the rules that keep it
fast and stable, and the full plan for what comes next.

Read sections 1–4 before touching code. Sections 5–12 are the product and system specs.
Section 13 is the phased roadmap with acceptance criteria.

---

## Table of contents

1. [Project snapshot](#1-project-snapshot)
2. [Tech stack & environment](#2-tech-stack--environment)
3. [Code map](#3-code-map)
4. [Engineering rules & gotchas (read this)](#4-engineering-rules--gotchas-read-this)
5. [Vision & design pillars](#5-vision--design-pillars)
6. [World expansion: Greater Kuala Lepak](#6-world-expansion-greater-kuala-lepak)
7. [Scaling the 3D world (performance architecture)](#7-scaling-the-3d-world-performance-architecture)
8. [Player profile, wallet & progression](#8-player-profile-wallet--progression)
9. [The phone (Telefon)](#9-the-phone-telefon)
10. [Tasks & storylines](#10-tasks--storylines)
11. [NPCs & dialogue](#11-npcs--dialogue)
12. [Jobs (mini-games) & transport](#12-jobs-mini-games--transport)
13. [Roadmap & milestones](#13-roadmap--milestones)
14. [Content, legal & tone guidelines](#14-content-legal--tone-guidelines)
15. [Appendix: how-tos](#15-appendix-how-tos)

---

## 1. Project snapshot

| | |
|---|---|
| Product | **Kuala Lepak** (city / open world) + mini-games ("jobs"). First job: **Anne Maju** (mamak drink game) |
| Live URL | https://kl.dotkod.com (city at `/`; Anne Maju is a door overlay — `/anne-maju` is the same city shell) |
| Repo | https://github.com/dotkod/play (public), branch `main` auto-deploys to production |
| Hosting | Vercel project **`play`** (team `sattiyans`), Git-connected |
| Data | Upstash Redis (Vercel Marketplace, resource `anne-maju-scores`) for leaderboards |
| Languages | Bahasa Malaysia (default) + English, switchable in-game |
| Platforms | Mobile browser first (landscape for games), desktop supported |
| Current game version | Kuala Lepak **v0.3.0**, Anne Maju **v1.5.2** (see `CHANGELOG.md`) |

### What exists today

**City (`/`, `src/hub/`)**
- Single junction town: one main road (x axis), one cross road (z axis), 10 buildings.
- Start screen (logo, tagline, "Mula jalan"), camera orbits until the player starts.
- Third-person player: WASD/arrows, touch joystick, tap/click-to-walk, tap a building to walk to its door.
- Follow camera: position tracks you; yaw is user-only (Q/R or right look pad) — no auto rotate; cutaway hides near-side buildings.
- Traffic: hatchback, sedan, SUV, MPV, taxi, lorry, bus, delivery bikes (green/orange/pink colourways, no logos). Drive on the **left**, stop at red lights, keep gaps, brake and honk for the player.
- Pedestrians (office workers, students, aunties, joggers, elders, umbrellas, kids), bus stop crowd, nasi lemak stall.
- Street cats (Oyen, Comot, Tompok, Si Hitam, Putih): wander/sit/groom/sleep, meow, can be **petted** (crouch, purr, hearts, follow you).
- Collisions for buildings, props, people, vehicles, cats.
- Minimap (player-centred, tap to walk), BM/EN, mute, synthesized music + ambience.
- Doors: Restoran Anne Maju (playable), Stesen LRT ("akan datang").
- Returning from a game respawns you at that building's door.

**Anne Maju (city door overlay + `/anne-maju` redirect, `src/games/anne-maju/`)**
- 90-second mamak shift: customers (groups of 1–3) order drinks, player builds them in 4 steps on a 3D counter (cup → powder → milk → sugar), taps the customer to serve.
- Tutorial on first play, pause + auto-pause, order slip, wrong-drink explanations, combos, coin fly, mood faces, haptics.
- Menu unlocks and outfits by career earnings; outfits also apply to the city character.
- Daily shift (seeded so everyone gets the same customers) + global leaderboards (today / week / all-time, one row per name).
- Share links `/anne-maju/k/<earned>-<served>` with dynamic score-card OG images.

---

## 2. Tech stack & environment

- **Next.js 16** (App Router, Turbopack, `cacheComponents: true`, React Compiler-era lint rules).
- **React 19**, **TypeScript 5**, **Tailwind CSS v4** (theme tokens in `src/app/globals.css`).
- **three.js r186** via **@react-three/fiber 9** + **@react-three/drei 10**.
- **@upstash/redis** for leaderboards. **@vercel/analytics**.
- Package manager: **pnpm**. Node 20+.

```bash
pnpm install
pnpm dev                 # http://localhost:3000 (the team's preview config uses 3210)
pnpm exec tsc --noEmit   # typecheck
pnpm lint                # eslint (strict react-hooks rules, see §4)
pnpm build               # must pass before pushing
```

Environment variables (pulled with `vercel env pull .env.local --yes`):
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Upstash, injected by the Marketplace integration)
- `VERCEL_PROJECT_PRODUCTION_URL` (auto) → canonical URL fallback in `src/shared/site.ts`
- `VERCEL_GIT_COMMIT_SHA` (auto) → shown as build hash next to the game version

Next.js 16 note: APIs differ from older versions. When unsure, read the docs bundled in
`node_modules/next/dist/docs/` (see `AGENTS.md`).

---

## 3. Code map

```
src/
  app/                      Routes, metadata, OG images, API
    page.tsx                City page (server: SEO text + JSON-LD) → <HubClient/>
    poster/page.tsx         Noindex 1200x630 scene used to capture the city OG image
    anne-maju/…             Anne Maju route, share pages, OG cards, poster
    api/scores/route.ts     Leaderboards (GET today/week/all, POST score)
    globals.css             Theme tokens, animations, edge-safe utilities (.edge-*, .safe-*)
    icon.tsx / apple-icon.tsx / icon-art.tsx   "KL" app icon (Baloo font via Google Fonts)
    manifest.ts / robots.ts / sitemap.ts
  hub/                      Kuala Lepak city (client only)
    hub.tsx                 DOM overlay: start screen, prompts, toast, joystick, minimap mount
    hub-client.tsx          dynamic(..., { ssr: false }) wrapper (depends on sessionStorage)
    world.tsx               <Canvas>: lights, city, traffic, NPCs, cats, player, poster camera
    world-data.ts           Layout constants + BUILDINGS list (data-driven)
    city.tsx                Ground, roads (ROAD_STRIPS), props, buildings, mamak front, labels
    traffic.tsx             Traffic lights + vehicles on city-wide lanes
    npcs.tsx                Walking pedestrians + standing crowd
    cats.tsx                Street cats: behaviour, petting, models
    player.tsx              Player controller, follow camera, collisions, door zones
    colliders.ts            Static + dynamic collision circles, prop positions
    controls.ts             Shared input state (keys, joystick, tap target)
    minimap.tsx             2D canvas minimap
    poster.tsx              City OG poster composition
    strings.ts              City UI strings (BM/EN)
  world/
    vehicle-routes.ts       Lanes from ROAD_STRIPS (shared with map / 3D asphalt)
    walk-spine.ts           ROAD_STRIPS + wayfinder spine
  games/anne-maju/          The mamak job (see meta.ts for version)
    game.tsx                All game UI + loop
    state.ts                Pure reducer (phases, customers, serving, pause, tutorial…)
    drinks.ts               Drink model, names, prices, phrases
    progress.ts             Career earnings, unlocks, outfits, tutorial flag, daily key
    strings.ts / i18n.ts    Server-safe string tables / client hooks
    scene/                  3D shop, drink counter, menu backdrop
    leaderboard*.ts(x)      Redis helpers + panel UI
  shared/
    three/toon.tsx          Toon materials + inverted-hull outline primitives (Box/RBox/Cyl/Ball)
    three/person.tsx        Character rig (poses: walk, seated, crouch, carry…)
    three/look.ts           Character looks + townsfolk generator
    three/use-frameloop.ts  Pauses hidden canvases
    audio.ts                Web Audio synth: sfx, two music tracks, city ambience
    rng.ts                  Seedable RNG (daily shifts)
    lang.ts                 Global BM/EN store
    logo.tsx                Kuala Lepak wordmark
    share.ts, site.ts, og-font.ts, use-best-score.ts
scripts/og-shot.sh          Captures OG images from /poster routes with headless Brave/Chrome
docs/KUALA_LEPAK.md         This file
CHANGELOG.md                Player-facing versions
```

---

## 4. Engineering rules & gotchas (read this)

These were all learned the hard way. Breaking them causes crashes, leaks or jank.

### Rendering & performance
1. **Never use drei `<Html>`.** It crashes React 19 on unmount (`removeChild` errors). Use the
   *projected DOM overlay* pattern instead: a `Projector` component inside the Canvas projects
   world positions to screen in `useFrame` and writes `style.transform` on plain DOM nodes
   (see `mamak-scene.tsx`).
2. **Cache canvas textures at module level** (labels, signs, facades). Creating a `CanvasTexture`
   per mount leaks GPU memory (this was the cause of the original "laggy after a while" bug).
   Pattern: `const cache = new Map<string, THREE.CanvasTexture>()`.
3. **Simulation state lives outside React.** Anything updated every frame (vehicles, cats,
   pedestrians, player position) is a module-level mutable object read in `useFrame`. Never
   `setState` per frame. React state changes only on *events* (zone entered, cat nearby…).
4. **Memoise static subtrees** (`memo`) and pass **stable callbacks** (`useCallback`, or a ref
   that holds the latest handler). The game loop ticks at 10 Hz; un-memoised 3D trees re-render
   every tick.
5. **Pause hidden canvases** with `useVisibleFrameloop` (Next keeps visited routes mounted and
   hidden for instant back navigation).
6. **Outlines are inverted hulls** (`toon.tsx`): each outlined primitive is 2 draw calls. Turn
   `outline={false}` on small/far props.
7. `PerformanceMonitor` drops DPR then shadows on slow devices; keep that wiring on any new Canvas.
8. Target budget on mid-range Android: **≤ 400 draw calls**, **≤ 300k triangles** visible, 60 fps
   desktop / 30+ fps phone. See §7 for the big-city plan.

### React / Next.js / lint
9. ESLint enforces React Compiler rules: no `Math.random`/`Date.now` in render, no setState
   synchronously inside effects, no reading/writing refs during render, no mutating hook return
   values. Use lazy `useState(() => …)`, event handlers, `useFrame`, or module singletons.
10. `cacheComponents: true`: reading `params`/`searchParams` needs `<Suspense>`; random/time in
    server components is not allowed during prerender. Anything depending on
    `localStorage`/`sessionStorage` should be a client-only dynamic import (`ssr: false`).
11. Server-imported modules must not import hooks. Keep string tables in plain `.ts` files
    (`strings.ts`) and hooks in separate client files (`i18n.ts`).
12. Strict-mode-safe reducers: generate randomness **outside** the reducer and pass it in the action.

### Gameplay & data
13. **Seeded runs:** game-logic randomness goes through `src/shared/rng.ts` (`rand`, `pick`).
    Cosmetic randomness (flavour lines, sfx variation) must use `Math.random` so it doesn't
    consume the seeded sequence.
14. Absolute timestamps vs offsets: "forever" must be `now + LARGE`, never a constant.
15. Pausing shifts every stored timestamp by the paused duration (`shiftTimes` in `state.ts`).
16. Leaderboard POSTs are range-checked server-side (`isPlausible`). Keep that for every new job.
16a. **Layout registry:** every building, landmark, car park, playground and billboard footprint
    is listed in `src/world/placements.ts` (`SOLIDS`). Export sizes from the district's
    `meta.ts`/`layout.ts`, use them in the scene, and add the footprint to `SOLIDS`; never
    hard-code a size only in a scene. Player collision and map tree culling read `SOLIDS`.
16b. **Layout check:** `pnpm check:layout` (`src/world/layout.test.ts`) fails when buildings
    overlap each other or the asphalt, props crowd buildings, or a spawn/door/stop/station exit
    is on grass or inside a wall. It runs inside `pnpm build`, so a bad layout blocks the deploy.
    Existing problems are listed in `KNOWN` with a reason; fix them by deleting their line.

### Mobile UI
17. Use `.edge-tl/.edge-tr/.edge-bl/.edge-br/.edge-top/.safe-px/.safe-pt/.safe-pr` for anything
    touching a screen edge (curved screens report no safe-area inset; fullscreen widens margins).
18. Centre overflowing content with **auto margins** (`m-auto`/`my-auto`), not
    `items-center`/`place-items-center`, or it slides under top buttons on short screens.
19. Games are landscape-only (`RotateHint`); the city works in both orientations.

### Process
20. Every player-facing change: bump the game's `version` in its `meta.ts` and add a
    `CHANGELOG.md` entry. Commit messages explain *why*.
21. After visual changes to the city or a game's look, regenerate OG art:
    run the dev server, open `/poster` (and `/anne-maju/poster`) once, then `./scripts/og-shot.sh`.

---

## 5. Vision & design pillars

**Kuala Lepak is "GTA, but wholesome and very Malaysian."** You've just moved to the city.
You find part-time jobs, meet the people, ride the trains, explore landmarks, and build a life:
from sleeping on a friend's sofa in Taman Lepak to owning your own kedai.

**Pillars**
1. **Relatable Malaysian life.** Mamak, LRT rush hour, parking hunts, rain, roti canai, makcik
   gossip, kucing jalanan. People should laugh because it's true.
2. **Non-violent.** No weapons, no killing, no crime sprees. Conflict comes from time pressure,
   traffic, demanding customers, and social comedy.
3. **Short sessions, long arcs.** Every job is a 60–120 s mini-game with its own leaderboard;
   the city wraps them into a story and progression that rewards coming back.
4. **Share-worthy.** Score cards, funny NPC lines, photo-worthy landmarks, daily challenges.
5. **Runs on a phone browser.** Instant load, no install, smooth on mid-range Android.

**Core loop**
```
Explore city → Phone pings with a task / NPC asks for help → Go there (walk / bus / LRT)
→ Do the job (mini-game) or interaction → Earn RM + XP + reputation → Unlock areas,
outfits, housing, new jobs → New tasks
```

---

## 6. World expansion: Greater Kuala Lepak

The city grows from one junction into a **district-based map** inspired by real KL. All
landmark and brand names are **parodies** (see §14).

### 6.1 Districts

| District (in-game) | Inspired by | Vibe & content | Jobs / activities |
|---|---|---|---|
| **Pusat Lepak** (start) | Masjid Jamek / Jalan TAR | Current junction town, shophouses, Restoran Anne Maju | Anne Maju (live), errands, cats |
| **KLCC → "Kota Lepak City Centre (KLCC)"** | KLCC | **Menara Berkembar** (twin towers with skybridge), Taman KLCC-style park with fountain, mall | Mall jobs, photo spots, influencer quests |
| **Bukit Bintik** | Bukit Bintang | Neon streets, malls, street food, monorail | Food delivery, street performer, hawker |
| **Menara Lepak** area | KL Tower / Bukit Nanas | **Menara Lepak** (TV tower with observation pod), forest hill | Tower lift operator, sky deck photos |
| **TLX (Tun Lepak Exchange)** | TRX | Glass financial district, **Menara 106** supertall, rooftop park | Office temp work, "Boss Nak EOD" job, security guard |
| **Taman Ceria** | Taman housing estates | Terrace houses, playground, surau, pasar malam (night market) on Wednesdays | Your first home, pasar malam stall, gardening, neighbour quests |
| **Kampung Lepak** | Kampung Baru | Wooden kampung houses on stilts against the skyline, nasi lemak stalls | Kampung errands, Raya open house events |
| **Chow Kit-ish "Pasar Besar"** | Chow Kit | Wet market, wholesale, lorries | Market runner, unloading lorries |
| **Petaling Lane** | Petaling Street | Lanterns, bargaining, dim sum | Bargaining mini-game, stall helper |
| **Bukit Jalan Sports City** | Bukit Jalil | **Stadium Bukit Jalan** (bowl stadium), sports arena, big car park | Matchday ticket/usher job, **Cari Parking** game, football events |
| **Sentral Lepak** | KL Sentral | Transit hub: LRT, MRT, monorail, KTM, airport train | Transit hub quests, lost & found |

### 6.2 Landmarks (must-have silhouettes)

| Landmark | Design notes |
|---|---|
| **Menara Berkembar** | Two 8-pointed-star-section towers with tapered tiers and a skybridge at ~40%. Silver toon material with window bands; visible from everywhere (impostor at distance) |
| **Menara Lepak** | Tall shaft + bulb pod + antenna, on a hill; red aircraft warning lights blinking at night |
| **Menara 106 (TLX)** | Faceted glass supertall, crown lit at night; TLX rooftop park at the base |
| **Stadium Bukit Jalan** | Bowl stadium with white roof ring and floodlights; matchday crowd events |
| **Masjid Lepak** | Masjid Jamek-style domes at a river confluence, near Pusat Lepak |
| **Sentral Lepak** | Large transit hall with multiple line platforms |
| **Taman KLCC-style park** | Fountain show at night, joggers, pond |

### 6.3 Transit network

Transit is both **fast travel** and **gameplay** (rides, crowds, the LRT job).

| Line | Colour | Inspired by | Stations (in-game names) |
|---|---|---|---|
| **LRT Laluan Kelana** | Red | Kelana Jaya line | Pusat Lepak, KLCC, Kampung Lepak, Sentral Lepak, Taman Ceria |
| **MRT Laluan Hijau** | Green | Kajang line | Sentral Lepak, Bukit Bintik, TLX, Pasar Besar, Bukit Jalan |
| **Monorel Lepak** | Lime | Monorail | Sentral Lepak, Bukit Bintik, Menara Lepak |
| **Bas RapidLepak** | Red/white/blue | RapidKL buses | Loop routes linking districts; bus stops show arrival times |
| **Teksi & e-hailing** | Various | Taxi / ride-hailing | Pay to fast-travel anywhere (later: driver job) |

- Stations are **enterable buildings**: platform scene, train arrives with doors, ride = short
  cutscene → teleport to the destination district (streamed in, §7).
- Rush hour (07:30–09:00, 17:30–19:30 game time) = packed platforms → the **LRT Sardin** job.
- Elevated guideways visible in the city (the current Stesen LRT platform is the template).

### 6.4 Day/night & weather (later phases)
- Game clock: follows the player's **real local time**. Lighting presets: pagi, tengah hari,
  petang (golden), malam (neon, building windows lit, landmarks illuminated).
- Weather: hujan lebat (heavy rain, sudden, short; NPCs open umbrellas and take shelter
  under five-foot ways), jerebu (haze) event.
- Night-only content: pasar malam, mamak 24 jam rush, fountain show.

---

## 7. Scaling the 3D world (performance architecture)

A KL-sized city cannot be one scene graph. Plan:

### 7.1 Chunked districts with streaming
- World is split into **districts**, each made of **chunks** (e.g. 64 × 64 m).
- `src/world/districts/<id>/` exports: layout data (roads, buildings, props, spawn points,
  NPC routes), and a lazy `load()` returning its React scene.
- A **ChunkManager** keeps the player's chunk + neighbours loaded (radius 1–2), unloads the rest,
  and shows **impostors** (low-poly blocks / billboards) for far chunks so the skyline stays.
- Landmarks have **3 LODs**: full (near), simplified (mid), impostor (far, always visible).
- Transit teleports load the destination district behind a short ride/cutscene.

### 7.2 Batching & instancing
- **InstancedMesh** for repeated items: trees, lamps, windows, terrace houses, cars of the same
  type, stools, road markings.
- **Merge static geometry per chunk** (`BufferGeometryUtils.mergeGeometries`) with a shared toon
  material + vertex colours → one draw call per material per chunk.
- **Facade texture atlas** instead of one texture per building.
- Outlines: keep hulls on hero objects only; for merged chunks use a single back-face hull mesh
  or a screen-space outline pass (post-processing), whichever profiles better on mobile.

### 7.3 Simulation scaling
- Vehicles/pedestrians/cats only simulate in loaded chunks; distant traffic is faked (instanced
  cars moving on splines without collision).
- **Road graph:** replace the hard-coded junction with a lane graph (nodes = intersections,
  edges = lanes) shared by traffic AI, pathfinding for NPCs, buses, and the minimap.
- Traffic lights are per-intersection controllers on the graph.
- Spatial hash for colliders instead of linear scans.

### 7.4 Budgets & tooling
- Add a dev-only perf overlay (draw calls, triangles, textures via `gl.info`, fps).
- Each district PR includes a screenshot of the overlay at its busiest viewpoint on a
  mid-range phone profile.
- Keep JS per district chunk < 150 KB gzipped; lazy-load district code.

### 7.5 Save positions
- Player position saved as `{ districtId, x, z }`. On load, stream that district first.

---

## 8. Player profile, wallet & progression

### 8.1 Profile (single save, shared by city and all jobs)

```ts
// src/core/profile.ts (proposed)
type Profile = {
  version: number;                 // save schema version for migrations
  name: string;                    // chosen on first launch ("Siapa nama kau?")
  createdAt: number;
  wallet: number;                  // sen (RM × 100)
  xp: number;
  level: number;                   // derived from xp, stored for quick reads
  reputation: Record<string, number>; // per place/NPC id, 0-100
  outfits: { owned: string[]; equipped: string };
  inventory: Record<string, number>;  // items (nasi lemak bungkus, Touch 'n Go card…)
  home: string | null;             // housing id (null = sofa at Kak Yati's place)
  flags: Record<string, boolean>;  // story flags
  tasks: { active: TaskProgress[]; done: string[] };
  stats: { catsPetted: number; shifts: Record<string, number>; distanceWalked: number; rides: number };
  position: { district: string; x: number; z: number };
  settings: { lang: "ms" | "en"; muted: boolean };
};
```

- Storage: `localStorage` key `kuala-lepak:profile` with **schema migrations** (`version`).
  Migrate the existing keys: `anne-maju:career`, `dotkod-play:outfit`, `dotkod-play:cats-petted`,
  `dotkod-play:lang`, `dotkod-play:muted`, `anne-maju:tutorial-done`.
- Store module: `useSyncExternalStore` + plain functions (`addMoney`, `addXp`, `setFlag`…),
  same pattern as `src/shared/lang.ts`.
- Later: optional cloud save (Upstash, keyed by an anonymous device id + optional login).

### 8.2 Economy
- Currency: **RM** (stored in sen). Jobs pay their score (Anne Maju: RM earned in the shift),
  tasks pay fixed rewards.
- Spending: outfits, food (restores "tenaga" (energy) if we add it), transit fares (Touch 'n Go-style
  card top-ups), rent/house upgrades, gifts for NPCs (reputation).
- Keep prices low and generous; the goal is progression, not grind.

### 8.3 Levels & unlocks
| Level | Unlocks |
|---|---|
| 1 | Pusat Lepak, Anne Maju, phone (Mesej, Dompet) |
| 2 | Bus stops, Taman Ceria, Peta app |
| 3 | LRT Laluan Kelana, KLCC, Kerja app job board |
| 4 | Bukit Bintik, delivery rider job |
| 5 | MRT Laluan Hijau, TLX, office temp job |
| 6 | Bukit Jalan, Cari Parking, matchday events |
| 8 | Rent your own room in Taman Ceria |
| 10 | Own a stall at the pasar malam |
| 15 | Own your own kedai (start-a-business arc) |

XP sources: tasks (main), jobs (scaled by performance), first visits to landmarks, petting
cats (small), helping NPCs.

---

## 9. The phone (Telefon)

A phone UI is the hub for tasks, messages, map and money. Opened with a 📱 button
(bottom-right above the minimap) or the `T` key. Portrait phone frame on desktop; full-screen
sheet on mobile. Notifications slide in from the top with a buzz + sound.

### 9.1 Apps

| App | Purpose |
|---|---|
| **Mesej** (messages) | WhatsApp-style chats from NPCs. **Tasks arrive here** as messages with an "Terima" (accept) button. Group chats for flavour ("Geng Taman Ceria"). |
| **Kerja** (jobs) | Job board: available jobs, pay range, location, unlock level, personal best and leaderboard link per job. "Pergi" button sets a waypoint. |
| **Peta** (map) | Full city map, districts, landmarks, stations, task markers; set waypoint; fast travel from stations once discovered. |
| **Dompet** (wallet) | Balance, recent transactions ("Anne Maju shift +RM24.30"), transit card top-up. |
| **GIG** (was Tugasan) | Active and completed gigs with objective checklists; pin one to the HUD. |
| **Profil** | Level, XP bar, wallet snapshot, GIG counts. |
| **Kamera** | Photo mode: hide the HUD, pose, frame, save/share an image (viral loop). |
| **Kenalan** (contacts) | NPCs you've met, reputation hearts, where to find them. |
| **Tetapan** (settings) | Language, sound, graphics quality (auto/low/high), credits, version. |

### 9.2 UX rules
- Max 2 taps from opening the phone to accepting a task.
- Unread badge on the phone button; tasks never expire unless they're timed events.
- Phone can be opened while walking; the game doesn't pause in the city (it pauses inside jobs).
- All copy in BM and EN from string tables (§14).

---

## 10. Tasks & storylines

### 10.1 Task schema (data-driven)

```ts
// src/core/tasks/types.ts (proposed)
type Objective =
  | { type: "goTo"; place: string }                                  // building/landmark/station id
  | { type: "talkTo"; npc: string; dialogue?: string }
  | { type: "playJob"; job: string; minEarned?: number; minServed?: number; mode?: "normal" | "daily" }
  | { type: "petCats"; count: number; catId?: string }
  | { type: "buy"; item: string; count: number; at?: string }
  | { type: "give"; item: string; npc: string }
  | { type: "ride"; line: string; from?: string; to?: string }
  | { type: "discover"; place: string }
  | { type: "wait"; until: "pagi" | "petang" | "malam" };

type Task = {
  id: string;
  title: { ms: string; en: string };
  giver: string;                          // npc id (message sender)
  intro: string;                          // dialogue id shown in Mesej / on talk
  objectives: Objective[];                // sequential by default
  rewards: { money?: number; xp?: number; item?: string; outfit?: string; unlock?: string; reputation?: Record<string, number> };
  requires?: { level?: number; tasksDone?: string[]; flags?: string[] };
  repeat?: "daily" | "weekly";
  chain?: string;                         // storyline id
};
```

- `TaskEngine` listens to a typed **event bus** (`emit("jobFinished", { job, earned, served })`,
  `emit("catPetted", { id })`, `emit("entered", { place })`, `emit("rideCompleted", …)`) and
  advances objectives. Jobs and city systems only emit events; they never know about tasks.
- Waypoints: the active objective's location shows on the minimap/Peta and as a ground arrow
  (reuse the current guide arrow).
- Jobs launched from a task show a banner in the game ("Tugasan: kutip RM10") and report back
  through the event bus when you return to the city.

### 10.2 Storyline: "Hari Pertama" (tutorial chain, ~10 minutes)
1. **Mesej from Kak Yati** (your cousin): "Dah sampai KL? Tidur rumah akak dulu kat Taman Ceria. Tapi kena cari kerja tau!" → *goTo* Pusat Lepak bus stop (tutorial for walking).
2. **Talk to Uncle Raju** at Restoran Anne Maju: "Kau cari kerja? Kebetulan anne aku cuti. Cuba satu shift." → *playJob* `anne-maju` (tutorial shift, any score).
3. **Uncle Raju**: "Not bad! Esok datang lagi, kutip RM15 boleh?" → *playJob* `anne-maju`, `minEarned: 1500`. Reward RM10 + outfit "Apron Anne Maju".
4. **Makcik Kiah** (nasi lemak): "Adik, tolong hantar nasi lemak ni kat Pakcik Osman kat bus stop." → *buy/give* item.
5. **Pakcik Osman**: "Terima kasih, nak. Kucing-kucing sini lapar tu, usaplah sikit." → *petCats* 3.
6. **Kak Yati**: "Bas ke Taman Ceria ada. Jom balik!" → *ride* bus to Taman Ceria → unlock Taman Ceria, home sofa. Level 2.

### 10.3 Further storylines (outline)
- **"Anak Mamak Jadi Tauke"**: Anne Maju reputation arc → become head anne → manage two counters → open a branch.
- **"Rider Paling Laju"**: delivery rider arc across Bukit Bintik; rival rider Bro Hafiz.
- **"Sardin Rush Hour"**: LRT arc with Kak Aini the station officer; lost-and-found side quests.
- **"Boss Nak EOD"**: office temp at TLX with Encik Daniel; meetings, printer jams, kopi runs.
- **"Matchday"**: Bukit Jalan stadium, Coach Rizal, crowd control + Cari Parking.
- **"Raya Open House"** (seasonal): Kampung Lepak, visit 5 houses, eat, dodge "bila nak kahwin?".
- **"Rumah Sendiri"**: save up, rent, decorate a room in Taman Ceria.

### 10.4 Daily & recurring
- Daily: 3 rotating mini-tasks (e.g. "2 shift Anne Maju", "usap Oyen", "naik LRT sekali").
- Weekly: a bigger goal with an outfit reward.
- The existing Anne Maju **daily shift** becomes a daily task too.

---

## 11. NPCs & dialogue

### 11.1 Dialogue system

```ts
// src/core/dialogue/types.ts (proposed)
type Line = {
  speaker: string;                    // npc id or "player"
  text: { ms: string; en: string };
  mood?: "happy" | "neutral" | "annoyed" | "sad" | "excited";
};
type Choice = {
  text: { ms: string; en: string };
  next?: string;                      // node id
  effects?: Effect[];                 // giveTask, addReputation, setFlag, giveItem, spendMoney
  requires?: Condition[];             // hasItem, minReputation, flag, level, money
};
type Node = { id: string; lines: Line[]; choices?: Choice[]; next?: string; effects?: Effect[] };
type Dialogue = { id: string; start: string; nodes: Record<string, Node> };
```

- UI: bottom dialogue box with portrait (rendered head of the NPC), name tag, typewriter text,
  tap to continue, 2–3 choice buttons. Works with touch and keyboard (1/2/3, Enter).
- Interaction: walking near an NPC shows "💬 Sembang dengan <name>" (same prompt system as doors
  and cats; priority: door > NPC > cat, all can stack).
- **Barks:** short one-liners above heads when you pass (projected DOM overlay), e.g. the
  cat-meow bubble pattern. Cooldowns so it isn't noisy.
- NPCs remember: reputation, flags, last talk time ("Eh, kau lagi!").
- All dialogue lives in data files (`src/content/dialogue/*.ts`), never in components.

### 11.2 Character roster

Names are Malaysian and mixed across communities. Personalities should be warm and
affectionate, never mocking an ethnicity or religion (§14).

| ID | Name | Role / location | Personality & hooks |
|---|---|---|---|
| `kak-yati` | **Kak Yati** | Your cousin, Taman Ceria | Bossy but caring, sends you voice-note style texts, starts the story |
| `uncle-raju` | **Uncle Raju** | Owner, Restoran Anne Maju | Loud, funny, calls everyone "boss", proud of his teh tarik |
| `anne-suresh` | **Anne Suresh** | Head anne, Anne Maju | Fast, competitive, your mentor/rival in the shop |
| `makcik-kiah` | **Makcik Kiah** | Nasi lemak stall, Pusat Lepak | Knows all the gossip, gives side quests, "sambal extra?" |
| `pakcik-osman` | **Pakcik Osman** | Bus stop regular | Retired bus driver, tells old-KL stories, loves the cats |
| `ah-seng` | **Uncle Ah Seng** | Kedai Runcit Ah Seng | Dry humour, haggles, sells transit card top-ups and snacks |
| `kak-aini` | **Kak Aini** | LRT station officer | Strict about rules, secretly kind; LRT storyline |
| `bro-hafiz` | **Bro Hafiz** | Delivery rider (green jacket) | Hype guy, rival in the rider job, speaks in Manglish |
| `mei-ling` | **Mei Ling** | University student, kopitiam | Content creator, gives photo-mode quests |
| `dr-siti` | **Dr. Siti** | Klinik 24 Jam | Calm, gives "rest" tips, health-themed tasks |
| `encik-daniel` | **Encik Daniel** | Office manager, TLX | "Boss nak EOD", corporate comedy |
| `coach-rizal` | **Coach Rizal** | Stadium Bukit Jalan | Football-mad, matchday tasks |
| `datin-sherry` | **Datin Sherry** | KLCC mall regular | Glamorous, generous tipper, fashion/outfit quests |
| `kumar` | **Kumar** | Taxi driver at Sentral Lepak | Knows every shortcut, unlocks taxi fast travel |
| `amoi` | **Amoi Jenny** | Kopitiam waitress | Cheerful, kopi orders, rival café to Anne Maju |
| `adik-danish` | **Adik Danish** | Kid in Taman Ceria | Asks you to find his lost cat (Tompok) |
| `tok-ketua` | **Tok Ketua** | Kampung Lepak village head | Raya and kampung event quests |
| `pak-guard` | **Pak Guard Rahman** | Security at TLX | Bored, chatty, minor quests and lore |

Recurring cat cast: **Oyen** (orange, Pusat Lepak), **Comot** (calico), **Tompok** (tuxedo),
**Si Hitam** (black), **Putih** (white). Each cat could have a favourite treat and a
"befriend" mini-arc.

### 11.3 Sample dialogue (style reference)

```
UNCLE RAJU: Eh boss! Kau budak baru tu kan? Kak Yati cakap kau cari kerja.
UNCLE RAJU: Anne aku cuti hari ni. Tahu buat teh tarik?
  [1] "Mestilah! Teh tarik kurang manis pun boleh."   → +rep, start shift
  [2] "Err... boleh belajar?"                        → tutorial shift
  [3] "Nanti dulu, uncle."                            → "Okay boss, jangan lama sangat!"
```

```
MAKCIK KIAH: Adik! Mari sini kejap. Pakcik Osman kat bus stop tu tak makan lagi.
MAKCIK KIAH: Tolong hantar nasi lemak ni. Sambal makcik letak lebih.
  [1] "Okay makcik!"   → give item, task accepted
  [2] "Berapa ringgit?" → "Ish, makcik belanja la. Pergi cepat!"
```

Barks (random, per NPC type):
- Aunties: "Panasnya hari ni…", "Harga barang naik lagi!"
- Students: "Esok exam weh…", "Jom mamak lepas ni?"
- Office workers: "Meeting lagi…", "Boss nak EOD."
- Riders: "Order masuk!", "Jem gila kat Bukit Bintik."

---

## 12. Jobs (mini-games) & transport

Every job has its own leaderboard, version, changelog entry, share card and OG image,
**and** a building/door in the city. Prefer embedding the job as a hub overlay (Anne Maju);
keep share routes (`/<slug>/k/...`) and optional SEO redirects.

### 12.1 Job contract
- Lives in `src/games/<slug>/` with `meta.ts` (`name`, `slug`, `version`, copy, `storageKey`).
- Reports results to the city through the event bus: `jobFinished({ job, earned, served, mode })`.
  (For now via `sessionStorage` handoff since jobs are separate routes; later via shared store.)
- Has its own `/api/scores` namespace (e.g. Redis keys `<slug>:scores:*`) with server-side
  plausibility checks.
- Reads the profile for outfits/unlocks, never writes the wallet directly (the city does on return).
- Uses the shared kit: toon primitives, person rig, audio, lang, edge-safe CSS, share.

### 12.2 Job backlog
| Job | Location | Core mechanic |
|---|---|---|
| **Anne Maju** (live) | Pusat Lepak | Memory + 4-step drink building |
| **LRT Sardin** | Any LRT station | Rush-hour crowd pushing, find space, exit at the right stop |
| **Rider Laju** | Bukit Bintik | Delivery routing in traffic, keep food hot, rate stars |
| **Cari Parking** | Bukit Jalan / malls | Circle the car park, spot leaving cars, avoid saman (fines) |
| **Boss Nak EOD** | TLX | Office task juggling against a clock |
| **Pasar Malam** | Taman Ceria (Wed night) | Run a stall: serve, bargain, restock |
| **Kopi Runner** | Kopitiam | Remember table orders across a busy kopitiam |
| **Matchday Usher** | Stadium | Seat fans fast, manage queues |
| **Tolong Makcik** | Pasar Besar | Carry groceries through the wet market |

### 12.3 Transport in the city
- **Bus:** wait at stop (arrival timer), board, short ride, alight at chosen stop.
- **LRT/MRT/Monorail:** tap in (fare from wallet), platform, train arrival, ride cutscene, arrive.
- **Taxi / e-hailing:** phone app, pay, instant travel (unlocked via Kumar).
- **Later:** player motorbike (non-violent driving, can't hit pedestrians: they dodge and scold you).

---

## 13. Roadmap & milestones

Each phase ends with: typecheck + lint + build passing, tested on a phone-sized landscape and
portrait viewport, OG art regenerated if visuals changed, CHANGELOG updated, deployed.

### Phase 0: Foundations (core systems, no new art)
- [x] `src/core/profile.ts` with schema + migrations from existing localStorage keys.
- [x] `src/core/events.ts` typed event bus.
- [x] City HUD: wallet (RM), level/XP bar, phone button.
- [x] Anne Maju returns results to the city (`sessionStorage` handoff → profile + event).
- **Done when:** finishing an Anne Maju shift and returning shows the RM added to the wallet.

### Phase 1: Phone, tasks, dialogue, "Hari Pertama"
- [x] Phone shell + Mesej, Tugasan, Dompet, Tetapan apps.
- [x] Task engine + schema + persistence; waypoint arrow + minimap markers.
- [x] Dialogue engine + UI + NPC interaction prompt.
- [x] Spawn named NPCs in Pusat Lepak: Uncle Raju, Makcik Kiah, Pakcik Osman, Uncle Ah Seng.
- [x] Storyline "Hari Pertama" steps 1–5 (step 6 needs Taman Ceria: stub with a "coming soon" bus).
- [x] Daily tasks (3 rotating).
- [x] Required cloud account on boot (`@username` + 6-digit PIN); no guest mode; Anne Maju highscores use the account name.
- **Done when:** a new player can complete Hari Pertama in ~10 minutes, entirely guided by the phone.

### Phase 2: World architecture for a big city
- [x] Road/lane graph + ROAD_STRIPS traffic (cars/buses/bikes on full-city corridors; Pusat signals).
- [x] District/chunk loader with impostors; perf overlay (`?perf=1`).
- [ ] Instancing + merged static geometry; facade atlas (partial — deferred polish).
- [x] Day/night lighting presets.
- [x] Live KL weather + jerebu haze (Open-Meteo + WAQI; atmosphere fog/rain/HUD).
- [x] Second district: Taman Ceria (walk + bus); KLCC remains Phase 3.
- **Done when:** two districts exist, walking between them streams smoothly at 30+ fps on a mid-range phone.

### Phase 3: KL landmarks & districts (one per PR)
- [x] Pusat Lepak expanded (Masjid Lepak + river stub in 0.5.1; more shophouses in 0.7.0)
- [x] KLCC + Menara Berkembar + park/fountain (0.5.0)
- [x] Taman Ceria (aligned terrace row + sidewalk, playground, enterable Rumah Kak Yati; pasar malam later)
- [x] Menara Lepak (0.6.0)
- [x] TLX + Menara 106 (0.7.0)
- [x] Bukit Bintik (0.7.0)
- [x] Bukit Jalan + Stadium (0.7.0)
- [x] Kampung Lepak, Pasar Besar, Petaling Lane, Sentral Lepak (0.7.0)

### Phase 4: Transit
- [x] Bus routes + stops with arrival times (0.9.0 — B101/B202 + ETA + RM1)
- [x] Anne Maju embedded in city + enterable Pusat shophouses (0.10.0)
- [x] LRT Laluan Kelana stations + rides (fast travel) (0.8.0)
- [x] MRT Laluan Hijau, Monorel Lepak (0.10.20)
- [x] Peta app fast travel; taxi via Kumar (0.10.20)

### Phase 5: More jobs
- [ ] LRT Sardin → Rider Laju → Cari Parking → Boss Nak EOD → Pasar Malam (one at a time, each with leaderboard)

### Phase 6: Life sim & social
- [ ] Housing (rent room, decorate), outfits shop, NPC reputation gifts
- [ ] Photo mode (Kamera) with share
- [ ] Weather + seasonal events (Raya, Deepavali, CNY, Merdeka)
- [ ] Optional cloud save / account; friends' scores

---

## 14. Content, legal & tone guidelines

- **Parody names only** for real brands and landmarks: Menara Berkembar (not Petronas Twin
  Towers), Menara Lepak (not KL Tower), TLX/Menara 106 (not TRX/Merdeka 118), Stadium Bukit
  Jalan, RapidLepak, LRT Laluan Kelana… No real logos, no brand names on vehicles or riders
  (delivery riders use colour schemes only). No real people.
- **Respectful humour.** Laugh with Malaysians, not at a community. NPCs from all backgrounds
  are competent, warm and funny. No stereotypes as punchlines; religion is shown respectfully
  (e.g. surau, masjid, temples as part of the city, never as a joke).
- **Non-violent.** No weapons, no harming people or animals (cats can only be petted, fed and
  befriended). Vehicles never hurt pedestrians; they stop and honk.
- **Language.** Every player-facing string exists in BM and EN, in string tables. BM is the
  default. Manglish is welcome in NPC lines. Keep sentences short for mobile.
- **No hard-sell.** No Dotkod promos inside the game. A small "made by" credit in Tetapan is fine.
- **Copy tone:** playful, local, a little cheeky. Avoid generic phrasing like "3D city game";
  prefer story hooks ("Kau baru pindah ke Kuala Lepak…").
- **Avoid em dashes in copy** (house style).

---

## 15. Appendix: how-tos

### Add a building to the current city
1. Add an entry to `BUILDINGS` in `src/hub/world-data.ts` (`id`, `kind`, `sign`, `x`, `side`, `w`, `d`, `h`, `color`, optional `game` or `soon`).
2. If it's a new `kind`, add its facade/front details in `src/hub/city.tsx`.
3. Doors for `game`/`soon` buildings, minimap and collisions are automatic.

### Add a new job (mini-game)
1. `src/games/<slug>/` with `meta.ts` (name, slug, **version**, copy, storageKey), `game.tsx`, `state.ts`, `strings.ts`.
2. Route `src/app/<slug>/page.tsx` + metadata + OG poster route; add to `scripts/og-shot.sh` and `sitemap.ts`.
3. Leaderboard keys under `<slug>:*` with plausibility checks.
4. Back button sets `sessionStorage["dotkod-play:spawn"] = <building id>` and links to `/`.
5. Add the building in the city with `game: { slug, title, emoji }`.
6. CHANGELOG entry.

### Add an NPC (after Phase 1)
1. Add to the roster file (`src/content/npcs.ts`): id, name, look, home position/route, barks.
2. Add dialogues in `src/content/dialogue/<npc>.ts`.
3. Optionally add tasks in `src/content/tasks/*.ts` with the NPC as giver.

### Regenerate OG images
```bash
pnpm dev   # keep running
# open http://localhost:3000/poster and /anne-maju/poster once in a browser (compiles the scenes)
./scripts/og-shot.sh http://localhost:3000
```

### Verify before pushing
```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```
Then check: city start screen, walking, a door prompt, a cat pet, Anne Maju tutorial/shift/
end screen, at phone landscape (844×390) and portrait (375×812).
