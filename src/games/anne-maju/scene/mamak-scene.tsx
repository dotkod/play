"use client";

import { PerformanceMonitor, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import { orderPhrase } from "../drinks";
import { useLang, useT } from "../i18n";
import { type GameState, LEAVE_MS, MAX_ASKS, type Party, patienceLeft } from "../state";
import { ANNE_LOOK, type Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { Ball, Box, Cyl, RBox, toonGradient } from "@/shared/three/toon";

import { ANNE_HOME, BUBBLE_Y, SEATS, SHOP_W, TABLES } from "../layout";

export { TABLES };

type Props = {
  s: GameState;
  cupReady: boolean;
  serveEvent: { table: number; id: number } | null;
  onTable: (i: number) => void;
  demo?: boolean;
  // Frozen hero angle for the OG poster screenshot
  poster?: boolean;
  // Anne in the player's chosen outfit
  anneLook?: Look;
  // Table to draw attention to (tutorial)
  pulseTable?: number | null;
  // Lets the game find each table's bubble on screen (coin fly animation)
  anchorsOut?: RefObject<(HTMLDivElement | null)[]>;
};

export default function MamakScene({ s, cupReady, serveEvent, onTable, demo = false, poster = false, anneLook = ANNE_LOOK, pulseTable = null, anchorsOut }: Props) {
  const ownAnchors = useRef<(HTMLDivElement | null)[]>([]);
  const anchors = anchorsOut ?? ownAnchors;
  const wrap = useRef<HTMLDivElement>(null);
  const frameloop = useVisibleFrameloop(wrap);
  const [dpr, setDpr] = useState(1.5);
  const [shadows, setShadows] = useState(true);

  return (
    <div ref={wrap} className="relative h-full w-full overflow-hidden">
      <Canvas frameloop={frameloop} shadows dpr={dpr} gl={{ antialias: true, powerPreference: "high-performance" }}>
        {/* Slow device: drop resolution first, then shadows */}
        <PerformanceMonitor
          onDecline={() => {
            if (dpr > 1) setDpr(1);
            else setShadows(false);
          }}
        />
        <color attach="background" args={["#8fd6cc"]} />
        <CameraRig demo={demo} poster={poster} />
        <Lights shadows={shadows} />
        <MamakContents s={s} serveEvent={serveEvent} onTable={onTable} anneLook={anneLook} anchors={demo ? undefined : anchors} outdoor />
      </Canvas>
      {!demo && <TableOverlays s={s} cupReady={cupReady} onTable={onTable} pulseTable={pulseTable} anchors={anchors} />}
    </div>
  );
}

/**
 * Everything inside the restaurant, in the room's frame. Rendered in the game's own canvas,
 * or inside the city building (the city places and lights it).
 */
export function MamakContents({
  s,
  serveEvent,
  onTable,
  anneLook = ANNE_LOOK,
  anchors,
  outdoor = false,
}: {
  s: GameState;
  serveEvent: Props["serveEvent"];
  onTable: (i: number) => void;
  anneLook?: Look;
  anchors?: RefObject<(HTMLDivElement | null)[]>;
  /** Road and grass outside the shop (only when the room stands alone). */
  outdoor?: boolean;
}) {
  const room = useRef<THREE.Group>(null);
  // Tables are memoised, so they get a stable callback that always calls the latest handler
  const onTableRef = useRef(onTable);
  useLayoutEffect(() => {
    onTableRef.current = onTable;
  });
  const tapTable = useCallback((i: number) => onTableRef.current(i), []);
  return (
    <group ref={room}>
      {anchors && <Projector els={anchors} room={room} />}
      <Shop outdoor={outdoor} />
      {TABLES.map((pos, i) => (
        <Table key={i} index={i} pos={pos} onTap={tapTable} />
      ))}
      <Customers s={s} />
      <Anne serveEvent={serveEvent} look={anneLook} />
    </group>
  );
}

/** Order bubbles over each table, pinned to the 3D tables by the Projector. */
export function TableOverlays({
  s,
  cupReady,
  onTable,
  pulseTable,
  anchors,
}: {
  s: GameState;
  cupReady: boolean;
  onTable: (i: number) => void;
  pulseTable: number | null;
  anchors: RefObject<(HTMLDivElement | null)[]>;
}) {
  return (
    <>
      {TABLES.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            anchors.current[i] = el;
          }}
          className="absolute top-0 left-0 will-change-transform"
        >
          <TableOverlay table={i} s={s} cupReady={cupReady} pulse={pulseTable === i} onTap={() => onTable(i)} />
        </div>
      ))}
    </>
  );
}

// With castShadow off the renderer skips the shadow pass entirely
const Lights = memo(function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <hemisphereLight args={["#fffaf0", "#9db8a8", 1.4]} />
      <directionalLight
        position={[4, 10, 5]}
        intensity={2.2}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
    </>
  );
});

// Pins each table's DOM bubble above the back diner's head. Plain DOM instead of drei <Html>,
// whose portal roots crash React 19 when the canvas unmounts between menu and game.
function Projector({ els, room }: { els: RefObject<(HTMLDivElement | null)[]>; room: RefObject<THREE.Group | null> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    TABLES.forEach(([x, z], i) => {
      const el = els.current[i];
      if (!el) return;
      v.set(x, BUBBLE_Y, z + SEATS[0].z);
      // Room may be placed inside the city: go room → world before projecting
      if (room.current) v.applyMatrix4(room.current.matrixWorld);
      v.project(camera);
      // Keep edge tables' bubbles fully on screen (up to 192px wide) and clear of curved glass
      const px = Math.min(size.width - 110, Math.max(110, ((v.x + 1) / 2) * size.width));
      const py = Math.max(8, ((1 - v.y) / 2) * size.height);
      el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -100%)`;
    });
  });
  return null;
}

// Fits all six tables plus the signboard: narrower screens get a wider lens
function CameraRig({ demo, poster }: { demo: boolean; poster: boolean }) {
  const aspect = useThree((st) => st.size.width / st.size.height);
  const halfWidth = Math.atan(5.9 / 9.6);
  const fov = Math.max(42, (2 * Math.atan(Math.tan(halfWidth) / aspect) * 180) / Math.PI);
  // Menus get a slow cinematic orbit around the shop
  useFrame(({ camera, clock }) => {
    if (!demo) return;
    const a = poster ? 0.42 : Math.sin(clock.elapsedTime * 0.15) * 0.55;
    const r = poster ? 8.6 : 10.5;
    camera.position.set(Math.sin(a) * r, poster ? 5 : 6, Math.cos(a) * r - 0.6);
    camera.lookAt(0, 0.6, -0.8);
  });
  return <PerspectiveCamera makeDefault fov={fov} position={[0, 7.4, 7.2]} onUpdate={(cam) => cam.lookAt(0, 0.4, -0.8)} />;
}

// ---------- Customers ----------

type Actor = { key: string; party: Party; table: number; guest: number; look: Look; leftAt: number | null };

function Customers({ s }: { s: GameState }) {
  // Departed groups stay rendered long enough to walk out
  const [prev, setPrev] = useState(s.tables);
  const [leaving, setLeaving] = useState<Actor[]>([]);
  if (prev !== s.tables) {
    const gone: Actor[] = [];
    prev.forEach((p, i) => {
      if (p && s.tables[i]?.id !== p.id) {
        // Own key space: a new shift restarts party ids, so a leaver could clash with a new arrival
        p.guests.forEach((g, gi) => gone.push({ key: `out:${p.id}-${gi}:${s.now}`, party: p, table: i, guest: gi, look: g.look, leftAt: s.now }));
      }
    });
    setPrev(s.tables);
    setLeaving([...leaving.filter((a) => s.now - (a.leftAt ?? 0) < LEAVE_MS), ...gone]);
  }

  // Actors read the live party (patience, asks) through this ref instead of re-rendering every tick
  const live = useRef(s.tables);
  useLayoutEffect(() => {
    live.current = s.tables;
  });
  const getLive = useCallback((table: number, id: number) => {
    const p = live.current[table];
    return p && p.id === id ? p : null;
  }, []);

  const seated: Actor[] = s.tables.flatMap((p, i) =>
    p ? p.guests.map((g, gi) => ({ key: `${p.id}-${gi}`, party: p, table: i, guest: gi, look: g.look, leftAt: null })) : [],
  );

  return (
    <>
      {[...seated, ...leaving].map((a) => (
        <CustomerActor key={a.key} table={a.table} guest={a.guest} look={a.look} party={a.party} leftAt={a.leftAt} getLive={getLive} />
      ))}
    </>
  );
}

function aisleFor(table: number, partyId: number) {
  const x = TABLES[table][0];
  if (x < 0) return -1.55;
  if (x > 0) return 1.55;
  return partyId % 2 ? 1.55 : -1.55;
}

// Road → aisle → behind the table → seat
function pathFor(table: number, guest: number, partyId: number): THREE.Vector2[] {
  const [tx, tz] = TABLES[table];
  const seat = SEATS[guest];
  const ax = aisleFor(table, partyId);
  const behind = tz - 1.35;
  return [
    new THREE.Vector2(Math.sign(ax) * 7 + guest * 0.3, 4.2),
    new THREE.Vector2(ax, 3.4),
    new THREE.Vector2(ax, behind),
    new THREE.Vector2(tx + seat.x, behind),
    new THREE.Vector2(tx + seat.x, tz + seat.z),
  ];
}

function samplePath(pts: THREE.Vector2[], t: number): { pos: THREE.Vector2; dir: THREE.Vector2 } {
  const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
  let d = Math.min(1, Math.max(0, t)) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const dir = pts[i + 1].clone().sub(pts[i]);
      if (dir.lengthSq() === 0) dir.set(0, 1);
      return { pos: pts[i].clone().lerp(pts[i + 1], lens[i] ? Math.min(1, d / lens[i]) : 1), dir: dir.normalize() };
    }
    d -= lens[i];
  }
  return { pos: pts[pts.length - 1], dir: new THREE.Vector2(0, 1) };
}

type ActorProps = {
  table: number;
  guest: number;
  look: Look;
  party: Party;
  leftAt: number | null;
  getLive: (table: number, id: number) => Party | null;
};

// Memoised on identity of the guest + whether they're leaving; everything else is read per frame
const CustomerActor = memo(
  function CustomerActor({ table, guest, look, party, leftAt, getLive }: ActorProps) {
    const path = useMemo(() => pathFor(table, guest, party.id), [table, guest, party.id]);
    const reversed = useMemo(() => [...path].reverse(), [path]);
    // Stagger group members slightly so they don't walk in as one blob
    const lag = guest * 180;

    const getPose = useCallback((): Pose => {
      const now = Date.now();
      if (leftAt !== null) {
        const { pos, dir } = samplePath(reversed, (now - leftAt - lag * 0.5) / LEAVE_MS);
        return { x: pos.x, z: pos.y, rotY: Math.atan2(dir.x, dir.y), walking: true, seated: false };
      }
      const arrive = party.seatedAt - party.arrivedAt;
      if (now < party.seatedAt) {
        const { pos, dir } = samplePath(path, (now - party.arrivedAt - lag) / (arrive - lag));
        return { x: pos.x, z: pos.y, rotY: Math.atan2(dir.x, dir.y), walking: true, seated: false };
      }
      const end = path[path.length - 1];
      const p = getLive(table, party.id) ?? party;
      return { x: end.x, z: end.y, rotY: SEATS[guest].rotY, walking: false, seated: true, angry: patienceLeft(p, now) < 0.3 || p.asks >= MAX_ASKS };
    }, [leftAt, reversed, path, party, lag, getLive, table, guest]);

    return <Person look={look} getPose={getPose} />;
  },
  (a, b) => a.party.id === b.party.id && a.guest === b.guest && a.leftAt === b.leftAt && a.table === b.table,
);

const MOOD = (p: number) => (p > 0.6 ? "😊" : p > 0.3 ? "😐" : "😤");

function TableOverlay({ table, s, cupReady, pulse, onTap }: { table: number; s: GameState; cupReady: boolean; pulse: boolean; onTap: () => void }) {
  const tr = useT();
  const lang = useLang();
  const p = s.tables[table];
  const seated = p && s.now >= p.seatedAt;
  const showing = p && s.now < p.revealUntil;
  const patience = p ? patienceLeft(p, s.now) : 0;
  const feedback = s.bubbles.findLast((b) => b.table === table);
  const asksLeft = p ? MAX_ASKS - p.asks : 0;
  const noted = p && s.slip?.partyId === p.id;

  return (
    <div className="flex w-max max-w-48 flex-col items-center gap-1">
      {feedback && (
        <div
          key={feedback.id}
          className={`max-w-48 animate-pop rounded-xl px-2.5 py-1 text-center text-sm leading-tight font-bold shadow ${feedback.kind === "good" ? "bg-leaf text-white" : "bg-chili text-white"}`}
        >
          {feedback.text}
        </div>
      )}
      {seated && (
        <button
          type="button"
          onClick={onTap}
          className={`relative flex flex-col gap-1 rounded-xl text-center leading-tight font-bold shadow-md transition active:scale-95 ${
            showing ? "w-48 bg-white px-2.5 py-2 text-sm text-ink" : cupReady ? "min-w-24 bg-leaf px-2.5 py-1.5 text-sm text-white" : "min-w-24 bg-white/85 px-2.5 py-1.5 text-sm text-ink/75"
          } ${pulse ? "animate-bounce ring-4 ring-amber-300" : ""}`}
        >
          {noted && <span className="absolute -top-2 -left-2 rounded-full bg-amber-300 px-1.5 text-xs shadow">📝</span>}
          <span>
            {showing
              ? `“${orderPhrase(
                  p.guests.map((g) => g.order),
                  lang,
                  p.seed,
                )}”`
              : cupReady
                ? `${MOOD(patience)} ${tr.serveHere}`
                : asksLeft > 0
                  ? `${MOOD(patience)} ${tr.askAgain(asksLeft)}`
                  : `😤 ${tr.noMoreAsks}`}
          </span>
          {p.guests.length > 1 && (
            <span className="flex justify-center gap-1">
              {p.guests.map((g, i) => (
                <span key={i} className={`size-3 rounded-full ${g.served ? "bg-leaf" : "bg-ink/25"}`} />
              ))}
            </span>
          )}
          <span className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
            <span className={`block h-full ${patience < 0.3 ? "bg-chili" : patience < 0.6 ? "bg-amber-400" : "bg-leaf"}`} style={{ width: `${patience * 100}%` }} />
          </span>
        </button>
      )}
    </div>
  );
}

// ---------- Anne (the player) ----------

const TRIP_MS = 1300;

const Anne = memo(function Anne({ serveEvent, look }: { serveEvent: Props["serveEvent"]; look: Look }) {
  const trip = useRef<{ table: number; start: number } | null>(null);
  const lastId = useRef<number | null>(null);

  useFrame(() => {
    if (serveEvent && serveEvent.id !== lastId.current) {
      lastId.current = serveEvent.id;
      trip.current = { table: serveEvent.table, start: Date.now() };
    }
  });

  const getPose = useCallback((): Pose => {
    const tr = trip.current;
    const home = { x: ANNE_HOME[0], z: ANNE_HOME[1], rotY: 0, walking: false, seated: false };
    if (!tr) return home;
    const t = (Date.now() - tr.start) / TRIP_MS;
    if (t >= 1) {
      trip.current = null;
      return home;
    }
    const [x, z] = TABLES[tr.table];
    const ax = aisleFor(tr.table, 1);
    // Walk down the aisle and stop beside the table
    const pts = [new THREE.Vector2(...ANNE_HOME), new THREE.Vector2(ax, ANNE_HOME[1]), new THREE.Vector2(ax, z + 0.3), new THREE.Vector2(x + Math.sign(ax - x || 1) * 1.05, z + 0.3)];
    const out = t < 0.5;
    const { pos, dir } = samplePath(out ? pts : [...pts].reverse(), out ? t * 2 : (t - 0.5) * 2);
    return { x: pos.x, z: pos.y, rotY: Math.atan2(dir.x, dir.y), walking: true, seated: false, carrying: out };
  }, []);

  return <Person look={look} getPose={getPose} />;
});

// ---------- Static set ----------

const Table = memo(function Table({ index, pos: [x, z], onTap }: { index: number; pos: [number, number]; onTap: (i: number) => void }) {
  const stool = index % 2 === 0 ? "#d8352a" : "#2f6fd6";
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onTap(index);
      }}
    >
      <Cyl top={0.62} bottom={0.62} height={0.05} position={[0, 0.76, 0]} color="#d3d7db" segments={28} />
      <Cyl top={0.05} bottom={0.05} height={0.72} position={[0, 0.38, 0]} color="#9ea4aa" />
      <Cyl top={0.3} bottom={0.32} height={0.04} position={[0, 0.02, 0]} color="#9ea4aa" />
      {SEATS.map((seat, i) => (
        <Stool key={i} position={[seat.x, 0, seat.z]} color={stool} />
      ))}
      {/* Generous invisible hit area for fat fingers */}
      <mesh position={[0, 0.8, -0.2]} visible={false}>
        <boxGeometry args={[2.2, 1.8, 2]} />
      </mesh>
    </group>
  );
});

function Stool({ color, ...props }: { color: string; position: [number, number, number] }) {
  return (
    <group {...props}>
      <Cyl top={0.2} bottom={0.25} height={0.46} position={[0, 0.23, 0]} color={color} />
    </group>
  );
}

const W = SHOP_W;

const Shop = memo(function Shop({ outdoor }: { outdoor: boolean }) {
  const sign = useMemo(() => signTexture(), []);
  return (
    <group>
      {/* Tiled floor; road and grass only when the room stands alone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -0.65]} receiveShadow>
        <planeGeometry args={[W, 9.3]} />
        <meshToonMaterial color="#e9e3d3" gradientMap={toonGradient()} />
      </mesh>
      {outdoor && (
        <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 6]} receiveShadow>
        <planeGeometry args={[40, 4]} />
        <meshToonMaterial color="#5b6066" gradientMap={toonGradient()} />
      </mesh>
      {[-9, -6, -3, 0, 3, 6, 9].map((x) => (
        <Box key={x} size={[1.4, 0.01, 0.12]} position={[x, 0, 6.1]} color="#f4f1ea" outline={false} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 40]} />
        <meshToonMaterial color="#86c27a" gradientMap={toonGradient()} />
      </mesh>
        </>
      )}

      {/* Back wall with green tiles and the signboard */}
      <Box size={[W, 3.4, 0.2]} position={[0, 1.7, -5.3]} color="#f4efe4" />
      <Box size={[W, 1.1, 0.05]} position={[0, 0.55, -5.18]} color="#3f9a76" outline={false} />
      <mesh position={[0, 2.8, -5.18]}>
        <planeGeometry args={[6.4, 1.1]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <Box size={[0.3, 3.4, 0.3]} position={[-W / 2 + 0.15, 1.7, -5.1]} color="#e0d8c6" />
      <Box size={[0.3, 3.4, 0.3]} position={[W / 2 - 0.15, 1.7, -5.1]} color="#e0d8c6" />

      {/* Counter, teh urn, roti display */}
      <RBox size={[6.4, 1, 0.8]} radius={0.04} position={[0, 0.5, -3.75]} color="#2f8f86" />
      <Box size={[6.5, 0.06, 0.9]} position={[0, 1.03, -3.75]} color="#cfd4d8" />
      <Cyl top={0.24} bottom={0.24} height={0.55} position={[-2.2, 1.33, -3.8]} color="#c3c8cd" />
      <Cyl top={0.05} bottom={0.05} height={0.12} position={[-2.2, 1.66, -3.8]} color="#3a3a3a" />
      <Box size={[1.3, 0.5, 0.55]} position={[2.1, 1.31, -3.8]} color="#bfe6ef" />
      {[-0.3, 0, 0.3].map((x) => (
        <Cyl key={x} top={0.12} bottom={0.12} height={0.03} position={[2.1 + x * 1.2, 1.1, -3.75]} color="#e7b45c" outline={false} />
      ))}
      {[-0.8, -0.55, -0.3].map((x) => (
        <Cyl key={x} top={0.07} bottom={0.055} height={0.16} position={[x, 1.14, -3.65]} color="#c9965f" />
      ))}

      <Plant position={[-W / 2 + 0.6, 0, 3.4]} />
      <Plant position={[W / 2 - 0.6, 0, 3.4]} />
      <Plant position={[-W / 2 + 0.6, 0, -4.6]} />
      <Plant position={[W / 2 - 0.6, 0, -4.6]} />
    </group>
  );
});

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cyl top={0.28} bottom={0.22} height={0.45} position={[0, 0.22, 0]} color="#b5603a" />
      <Ball radius={0.42} position={[0, 0.8, 0]} color="#4caf62" />
      <Ball radius={0.3} position={[0.2, 1.1, 0.1]} color="#5cbf70" />
    </group>
  );
}

let signCache: THREE.CanvasTexture | null = null;

// Created once per page and reused across menu/game remounts so it never leaks GPU memory
function signTexture() {
  if (signCache) return signCache;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 180;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c62f25";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#f6d13a";
  g.lineWidth = 10;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.fillStyle = "#f6d13a";
  g.font = "900 78px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("RESTORAN ANNE MAJU", c.width / 2, 72);
  g.font = "700 40px system-ui, sans-serif";
  g.fillStyle = "#ffffff";
  g.fillText("MAMAK · 24 JAM · TEH TARIK", c.width / 2, 138);
  signCache = new THREE.CanvasTexture(c);
  signCache.colorSpace = THREE.SRGBColorSpace;
  return signCache;
}
