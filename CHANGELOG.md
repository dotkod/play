# Changelog

Player-facing versions of the games. The version shows in each game's menu and pause screen,
next to the short commit of the deploy.

## Kuala Lepak

### 0.10.19
- Login required on boot — one gamey username + PIN-pad screen (auto signup / login); Anne Maju highscores save under your account
- Portrait phones get a shared “turn to landscape” gate (city, login, Anne Maju)
- City HUD shows your @username under the logo

### 0.10.18
- TLX road no longer buried under the park (cars stay on asphalt); map roads use round corners; Kampung spur reaches the village
- Map / minimap no longer show moving traffic (only you, cats, pins)

### 0.10.17
- Roads connect every district (spine → continuous asphalt); map towers + pedestrian alleys; less empty green forest

### 0.10.16
- Full map pan stays inside the city bounds (no dragging into empty grass)

### 0.10.15
- Dialogue: no dim overlay; camera zooms in on you + the NPC (they face each other)

### 0.10.14
- Chat: big Continue button, tap-outside / Esc to close; branching replies (nested nodes); Osman handoff opens dialogue instead of silent give

### 0.10.13
- Active task is a centered banner below the logo / minimap (no longer jammed under the wordmark)

### 0.10.12
- Camera no longer auto-turns — you aim it (Q/R on desktop, look pad on the right on touch)

### 0.10.11
- Messages Accept actually starts the task (daily id lookup fixed); opens Tasks instead of slamming the phone shut

### 0.10.10
- Camera stays locked while you walk (no chase-cam sway); only slowly flips after you fully change sidewalk

### 0.10.9
- Camera gently follows behind you (no hard sidewalk flip); turn speed capped so doors / U-turns don’t whip the view

### 0.10.8
- Fixed overlapping / flickering roads (district asphalt removed; city strips layered cleanly)

### 0.10.7
- Traffic (cars, buses, bikes) and 3D asphalt now follow the full city ROAD_STRIPS — not just the Pusat block

### 0.10.6
- Camera back to shop-facing (stable at doors); WASD/stick keep their direction until you let go, so a sidewalk flip won’t reverse you mid-stride

### 0.10.5
- Camera follows behind you instead of hard-flipping on the opposite sidewalk (WASD no longer feels reversed)

### 0.10.4
- Traffic: cars no longer stack — length-aware spawn, hard bumper gaps, brake for pedestrians
- Sidewalk walkers spread out so they don’t clump into each other / the carriageway

### 0.10.3
- City HUD: clock + wallet sit beside the logo on one row (no dark cards)

### 0.10.2
- Anne Maju door is a fade-through veil (same session) — no separate-page feel
- `/anne-maju` mounts the city shell with the mamak open; exit is “jalan keluar”

### 0.10.1
- Phone UI: back button works again; notification badges no longer clipped
- Home screen polish (dock glass, side bezels, task badges, emptier inbox state)

### 0.10.0
- Anne Maju plays inside the city (door → job overlay; `/anne-maju` opens the city shift)
- Enter shophouses: door prompts + indoor overlay for every Pusat shop
- Door notches so you can step into enterable doorways

### 0.9.0
- RapidLepak routes B101 / B202 with live ETAs on the BAS pole and bus board
- Flat RM1.00 fare; board grouped by route

### 0.8.2
- Map roads redrawn as continuous spines (no broken/misaligned fills); district labels on top
- Wayfinder follows roads (not diagonals through buildings); LRT markers no longer draw fake cross-city dashes
- 3D connector roads east/west/north/south out of Pusat

### 0.8.1
- Fix: Phase 3 shophouses were jammed into occupied slots (overlapping LRT / neighbours) and one sat on the cross-road lane
- Re-slotted Farmasi, Kedai Emas, Warung, Surau into real gaps; layout assert in dev; traffic won’t enter buildings

### 0.8.0
- LRT Laluan Kelana: 5 stations (Pusat, KLCC, Kampung, Sentral, Taman) — tap in RM1.20, ride overlay, teleport
- Stesen LRT door is live; map shows the red line + 🚇 markers

### 0.7.0
- Phase 3 city: TLX / Menara 106, Bukit Bintik, Bukit Jalan stadium, Kampung Lepak, Pasar Besar, Petaling Lane, Sentral Lepak
- Pusat Lepak gains more shophouses; bus board at Pusat lists every district stop
- Map + places cover the full KL-ish spread; daily visit tasks for new landmarks

### 0.6.0
- Menara Lepak west of Pusat — hill, shaft + bulb tower, night aircraft lights
- Bus Pusat → Menara Lepak (or walk west); skyline impostor from town

### 0.5.3
- Dedicated Masa / Time chip on the city HUD (clock + pagi/petang/malam)

### 0.5.2
- City clock follows your real local time (day/night lighting matches when you play)

### 0.5.1
- City map filled with trees, district labels, river, masjid, playground (matches 3D scatter)
- Sungai Lepak + Masjid Lepak stub west of Pusat Lepak

### 0.5.0
- KLCC district north of Pusat: Menara Berkembar, park, fountain
- Bus from Pusat → KLCC (or walk north); skyline towers visible from town

### 0.4.1
- Bus stop has a tall BAS sign; 🚌 markers on the map
- Tap the minimap to open a pan/zoom city map and drop a wayfinder pin

### 0.4.0
- World streaming foundations (`src/world/`): road graph, chunks, day/night clock on the HUD
- Taman Ceria district — walk the connector road or take the bus from Pusat Lepak
- Hari Pertama ends at your home sofa
- Dev perf overlay: add `?perf=1` to the URL

### 0.3.2
- Opening the phone: character pulls it from their pocket, then the screen animates in

### 0.3.1
- Phone UI restyled like an iPhone (bezel, Dynamic Island, home screen icons, iOS lists)

### 0.3.0
- Phone with Mesej, Tugasan, Dompet, Tetapan
- Hari Pertama story (Kak Yati → Uncle Raju → Makcik Kiah → Pakcik Osman → cats)
- Named NPCs, dialogue, buy nasi lemak, waypoints
- Daily rotating mini-tasks
- Optional cloud account: @username + 8-digit PIN (guest stays on-device)

### 0.2.0
- Wallet and level/XP on the city HUD
- Phone button (apps arrive next phase)
- Finishing an Anne Maju shift adds the RM to your city wallet when you walk back

## Anne Maju

### 1.5.4
- Embedded exit says “jalan keluar”; settles in with the city door veil

### 1.5.3
- Fits mobile viewport (fixed shell; drink station stacks on short screens)
- Can run embedded in the city; Leave returns without a page reload

### 1.5.2
- Shift earnings pay into your Kuala Lepak wallet when you return to the city

### 1.5.1
- Buttons stay clear of curved and notched screen edges in fullscreen
- Version number shown on the menu and pause screen

### 1.5.0
- Pause (and auto-pause when you leave the app), pause menu with quit
- First-time tutorial with highlighted steps
- Wrong drinks say what was wrong; tap an order to note it on a slip
- Coin and combo effects, mood faces, haptics, bigger text
- End-of-shift breakdown, next-rank goal, share with score-card image
- Daily shift with its own leaderboard
- Menu unlocks and outfits for Anne from total earnings

### 1.4.0
- Back button to the Play MY city

### 1.3.0
- Groups of 1-3 customers, six tables, limited "tanya balik", BM/EN

### 1.2.0
- Global leaderboard, music and sound effects

### 1.1.0
- 3D drink counter with step-by-step picks

### 1.0.0
- First release
