# Changelog

Player-facing versions of the games. The version shows in each game's menu and pause screen,
next to the short commit of the deploy.

## Kuala Lepak

### 0.12.0
- Walk straight into Restoran Anne Maju: the real restaurant is inside the building (tables, counter, Anne), no screen change
- Step inside and the shift card pops up over the room; start and the camera glides to the serving view while the city keeps living outside
- Fountain water no longer shimmers; people on the sidewalk pass each other cleanly and fall in behind slower walkers instead of stop-starting

### 0.11.2
- New phone: a flip phone on bigger screens (pops up closed with the time on the cover, then flips open) and a fold phone on phones (opens like a book into a split screen: apps on the left, the open app on the right)
- Cars and vans have proper wheel wells; shophouse rooftops no longer shimmer

### 0.11.1
- Street lamps switch on at dusk (6:30pm) and off at dawn (7am), with pools of light on the road
- On jerebu days you and everyone on the street wear face masks; clear days, no masks
- Buildings in front of you fade to see-through instead of vanishing, and the camera never ends up inside a roof

### 0.11.0
- Brand-new Kuala Lepak: Pusat rebuilt from scratch as a proper 3×3-block town centre
- Real streets: lane lines, zebra crossings, stop lines, working traffic lights, kerbs and tiled sidewalks, street lamps that light up at night, trees
- Shophouse rows with five-foot ways and shop signs, office towers, Mega Mall and a park with a fountain and playground
- Traffic drives on the left, stops at red lights, waits for people and never drives through other cars; GRAP, SHOPI, foodpandai and LALAMOOV riders and vans
- Walk into Restoran Anne Maju through its door (look for the glowing mat)
- New minimap; the phone keeps Mesej, Profil, Dompet and Tetapan
- The old districts, transit rides, NPC story and tasks are retired until they're rebuilt for the new city

### 0.10.62
- Roads no longer drive into buildings: Sentral hall, Menara Lepak tower, Bukit Bintik strip and Stadium Bukit Jalan moved clear (the stadium road now ends at the gate)
- Kampung Lepak road actually reaches the village (the last stretch was missing)
- Petaling car park no longer sits inside Klinik 24 Jam
- Footpaths to the KLCC and Sentral bus stops and to the LRT KLCC, LRT Taman Ceria, MRT Sentral and MRT Pasar Besar exits (you could arrive and be stuck on grass)
- District buildings are solid now (no walking through Sentral, Bintik, kampung houses, Menara 106 or the KLCC podium)
- City map draws every district building, so it matches what you see in 3D

### 0.10.61
- Night is readable now: blue-hour lighting instead of near-black
- Haze, cloud and rain tint the city but can no longer black it out (night + jerebu was ~15% light)

### 0.10.60
- SE billboard no longer stands in the middle of the Bukit Bintik neon strip
- City map stops drawing filler blocks over real houses, roads, car parks and the Sentral hall
- Wayfinder can route through the Mega Mall car park driveway
- Layout check runs on every deploy so overlapping buildings and roads get caught before release

### 0.10.59
- Taman Ceria is a real terrace row now — road to x=140, houses on the sidewalk with roofs/doors, home door reachable

### 0.10.58
- Rumah Kak Yati in Taman Ceria is enterable — go inside, nap on the bed (rest only; real clock stays)

### 0.10.57
- Billboards moved onto open grass (not next to shophouses) — clear of buildings + parking

### 0.10.56
- Billboards cleared of Petaling shophouses (was inside a shop); spots footprint-checked in dev

### 0.10.55
- Billboards sit on the sidewalk now — no more boards punching through shophouses

### 0.10.54
- Roadside billboards replace the sky plane — ads you can actually see while walking (joke + sponsor slot)

### 0.10.53
- Live KL weather + jerebu (Open-Meteo + WAQI) — fog, rain, AQI chip on the HUD

### 0.10.52
- (replaced) Sky banner biplane — swapped for billboards in 0.10.54

### 0.10.51
- Roads/sidewalks cleaned city-wide — no more jagged verges, round junction blobs, or path stubs past the asphalt

### 0.10.50
- No @username floating above your head
- City traffic flows cleaner — less reverse/jam/overlap; fewer cars; turns preferred over U-turns

### 0.10.49
- Restoran Anne Maju is a real NE corner mamak (Kedai Emas gone) — wrap awning, outdoor tables & chairs, menu board

### 0.10.48
- Traffic unsticks after a few seconds — crossing cars no longer deadlock forever at junctions

### 0.10.47
- Pasar Besar / Bukit Jalan map cleaned: stadium off the road, no driveway stubs smashing the L, labels and icons clear of asphalt

### 0.10.46
- Phone shell locks a real 390∶844 frame (no more skinny/squeezed icons on desktop)

### 0.10.45
- Pasar Besar / Bukit Jalan: market halls and stadium are solid; halls no longer sit on the road; map blocks clear of bus stops

### 0.10.44
- Phone shell keeps a real iPhone ratio on desktop again (and still fits landscape mobile)

### 0.10.43
- Petaling junction uses city asphalt only (no stacked plazas/zebra); parking lot sits clear of the spur; lot cars stay inside the lot

### 0.10.42
- Petaling Lane cleaned up — no mid-road poles, awnings don’t fight each other, lanterns hang from the verge

### 0.10.41
- Cars stay on real roads — no more cutting through parking lots / P-sign poles

### 0.10.40
- Street trees no longer grow through shop walls (cross-road props skip building footprints)

### 0.10.39
- Petaling Lane shophouses no longer sit on the approach road — walk straight in from Pusat

### 0.10.38
- Parking lots sit on real driveways off the road network (map shows P), and cars drive in/out to park

### 0.10.37
- Walk only on roads, roadside, footpaths, parking and plazas — grass is off-limits
- Petaling Lane has proper five-foot ways and crossings; city grass looks more grassy

### 0.10.36
- No more trees planted on district roads; road junctions overlap so seams don’t show grass gaps

### 0.10.35
- Walking up to a shop no longer makes the building vanish (cutaway only when the camera is truly behind the block)

### 0.10.34
- Petaling Lane has a real road in (T-junction + N–S street) so you can walk and drive there; dead-end traffic jams cleared
- Parking lots with bay lines and parked cars: Mega Mall, Petaling, Pasar Besar, Stadium

### 0.10.33
- Petaling Lane is real Chinatown shophouses (signs, awnings, lanterns) with solid collision — no more walk-through beige boxes

### 0.10.32
- Logout stops city BGM (no more overlapping tracks on the next login)
- Buildings stay solid — walk to the door and enter the interior scene; no walking through walls
- Phone shell keeps a real portrait ratio on mobile (smaller, not stretched)

### 0.10.31
- Welcome-back toast shows again after login (was racing the auth hello stash)

### 0.10.30
- Login PIN is 6 digits (was 8) — faster pad entry

### 0.10.29
- City BGM is a 4-track playlist (lepak / highway / pasar / senja) that rotates; each login starts a different song than last time

### 0.10.28
- City BGM keeps looping after login; car horn is a proper dual-tone beep

### 0.10.27
- Login drops you into the city (can walk) with a welcome-back toast; signup still opens the tutorial

### 0.10.26
- City HUD logout; welcome-back toast on login; first-signup city tutorial (walk / look / phone / world)

### 0.10.25
- Bus / LRT / taxi rides are 3D cabins now — seats, poles, window scenery rushing past, camera sway

### 0.10.24
- Phone: Tasks → GIGs; new Profil app (level, XP, wallet, GIG counts)
- Bus / LRT / taxi “On the way…” screens share a cleaner ride card with a live progress bar

### 0.10.23
- Small @username tag floats above your character

### 0.10.22
- Shadows are not walls — softer sun shadows; building collision flush with the facade (no invisible block on the grass verge); cutaway shops don’t keep a solid while hidden

### 0.10.21
- Traffic turns at junctions (not only U-turns) and keeps world-space gaps so cars stop stacking
- Trees stay off roads, buildings, river, masjid, and stadium

### 0.10.20
- MRT Laluan Hijau + Monorel Lepak (board like LRT); phone Peta fast-travel to discovered stations; taxi via Kumar at Sentral

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

### 1.6.0
- Plays inside the city's own restaurant: walk in, start a shift from the card, serve, walk out
- Fixed customers occasionally vanishing when a new shift started right after the tutorial

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
