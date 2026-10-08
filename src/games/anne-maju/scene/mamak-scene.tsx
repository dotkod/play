"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type Customer, type GameState, LEAVE_MS } from "../state";
import { ANNE_LOOK } from "./look";
import { Person, type Pose } from "./person";
import { Ball, Box, Cyl, RBox, toonGradient } from "./toon";

export const TABLES: [number, number][] = [
  [-1.6, -1.1],
  [1.6, -1.1],
  [-1.6, 1.5],
  [1.6, 1.5],
];
const SEAT_OFFSET = -0.78;
const ANNE_HOME: [number, number] = [0, -2.75];

type Props = {
  s: GameState;
  cupReady: boolean;
  serveEvent: { table: number; id: number } | null;
  onTable: (i: number) => void;
  demo?: boolean;
};

export default function MamakScene({ s, cupReady, serveEvent, onTable, demo = false }: Props) {
  const anchors = useRef<(HTMLDivElement | null)[]>([]);
  return (
    <div className="relative h-full w-full overflow-hidden">
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <Projector els={anchors} />
      <color attach="background" args={["#8fd6cc"]} />
      <CameraRig demo={demo} />
      <hemisphereLight args={["#fffaf0", "#9db8a8", 1.4]} />
      <directionalLight
        position={[4, 9, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <Shop />
      {TABLES.map((pos, i) => (
        <Table key={i} index={i} pos={pos} onTap={() => onTable(i)} />
      ))}
      <Customers s={s} />
      <Anne serveEvent={serveEvent} />
    </Canvas>
      {!demo &&
        TABLES.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              anchors.current[i] = el;
            }}
            className="absolute top-0 left-0 will-change-transform"
          >
            <TableOverlay table={i} s={s} cupReady={cupReady} onTap={() => onTable(i)} />
          </div>
        ))}
    </div>
  );
}

// Pins each table's DOM bubble above the seated customer's head. Plain DOM instead of drei <Html>,
// whose portal roots crash React 19 when the canvas unmounts between menu and game.
function Projector({ els }: { els: RefObject<(HTMLDivElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    TABLES.forEach(([x, z], i) => {
      const el = els.current[i];
      if (!el) return;
      v.set(x, 2.05, z + SEAT_OFFSET).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -100%)`;
    });
  });
  return null;
}

// Portrait phones need a wider lens to fit all four tables
function CameraRig({ demo }: { demo: boolean }) {
  const aspect = useThree((st) => st.size.width / st.size.height);
  const portrait = aspect < 1;
  // Menus get a slow cinematic orbit around the shop
  useFrame(({ camera, clock }) => {
    if (!demo) return;
    const a = Math.sin(clock.elapsedTime * 0.15) * 0.6;
    const r = portrait ? 9.5 : 8.6;
    camera.position.set(Math.sin(a) * r, portrait ? 6.2 : 5.2, Math.cos(a) * r - 0.6);
    camera.lookAt(0, 0.6, -0.8);
  });
  return (
    <PerspectiveCamera
      makeDefault
      fov={aspect < 0.7 ? 58 : portrait ? 50 : 44}
      position={[0, portrait ? 6.4 : 6.9, portrait ? 6.6 : 7.4]}
      onUpdate={(cam) => cam.lookAt(0, 0.3, -0.8)}
    />
  );
}

// ---------- Customers ----------

type Actor = { c: Customer; table: number; leftAt: number | null; happy: boolean };

function Customers({ s }: { s: GameState }) {
  // Keep departed customers around long enough to walk out
  const [prev, setPrev] = useState(s.tables);
  const [leaving, setLeaving] = useState<Actor[]>([]);
  if (prev !== s.tables) {
    const gone: Actor[] = [];
    prev.forEach((c, i) => {
      if (c && s.tables[i]?.id !== c.id) {
        const b = s.bubbles.findLast((x) => x.table === i);
        gone.push({ c, table: i, leftAt: s.now, happy: b?.kind === "good" });
      }
    });
    setPrev(s.tables);
    setLeaving([...leaving.filter((a) => s.now - (a.leftAt ?? 0) < LEAVE_MS), ...gone]);
  }

  const seated: Actor[] = s.tables.flatMap((c, i) => (c ? [{ c, table: i, leftAt: null, happy: false }] : []));

  return (
    <>
      {[...seated, ...leaving].map((a) => (
        <CustomerActor key={a.c.id} actor={a} />
      ))}
    </>
  );
}

function pathFor(table: number): THREE.Vector2[] {
  const [x, z] = TABLES[table];
  const side = Math.sign(x);
  return [new THREE.Vector2(side * 4.6, 3.6), new THREE.Vector2(side * 3.1, z + SEAT_OFFSET), new THREE.Vector2(x, z + SEAT_OFFSET)];
}

function samplePath(pts: THREE.Vector2[], t: number): { pos: THREE.Vector2; dir: THREE.Vector2 } {
  const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
  let d = Math.min(1, Math.max(0, t)) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const dir = pts[i + 1].clone().sub(pts[i]).normalize();
      return { pos: pts[i].clone().lerp(pts[i + 1], Math.min(1, d / lens[i])), dir };
    }
    d -= lens[i];
  }
  return { pos: pts[pts.length - 1], dir: new THREE.Vector2(0, 1) };
}

function CustomerActor({ actor }: { actor: Actor }) {
  const path = useMemo(() => pathFor(actor.table), [actor.table]);
  const reversed = useMemo(() => [...path].reverse(), [path]);
  const ref = useRef(actor);
  useEffect(() => {
    ref.current = actor;
  });

  const getPose = (): Pose => {
    const { c, leftAt } = ref.current;
    const now = Date.now();
    if (leftAt !== null) {
      const { pos, dir } = samplePath(reversed, (now - leftAt) / LEAVE_MS);
      return { x: pos.x, z: pos.y, rotY: Math.atan2(dir.x, dir.y), walking: true, seated: false };
    }
    if (now < c.seatedAt) {
      const { pos, dir } = samplePath(path, (now - c.arrivedAt) / (c.seatedAt - c.arrivedAt));
      return { x: pos.x, z: pos.y, rotY: Math.atan2(dir.x, dir.y), walking: true, seated: false };
    }
    const end = path[path.length - 1];
    const patience = (c.leaveAt - now) / (c.leaveAt - c.seatedAt);
    return { x: end.x, z: end.y, rotY: 0, walking: false, seated: true, angry: patience < 0.3 };
  };

  return <Person look={actor.c.look} getPose={getPose} />;
}

function TableOverlay({ table, s, cupReady, onTap }: { table: number; s: GameState; cupReady: boolean; onTap: () => void }) {
  const c = s.tables[table];
  const seated = c && s.now >= c.seatedAt;
  const showing = c && s.now < c.revealUntil;
  const patience = c ? Math.max(0, (c.leaveAt - s.now) / (c.leaveAt - c.seatedAt)) : 0;
  const feedback = s.bubbles.findLast((b) => b.table === table);

  return (
      <div className="flex w-36 flex-col items-center gap-1">
        {feedback && (
          <div
            key={feedback.id}
            className={`animate-pop rounded-xl px-2 py-1 text-center text-xs font-bold shadow ${
              feedback.kind === "good" ? "bg-leaf text-white" : "bg-chili text-white"
            }`}
          >
            {feedback.text}
          </div>
        )}
        {seated && (
          <button
            type="button"
            onClick={onTap}
            className={`flex w-full flex-col gap-1 rounded-xl px-2 py-1.5 text-center text-xs leading-tight font-bold shadow-md transition active:scale-95 ${
              showing ? "bg-white text-ink" : cupReady ? "bg-leaf text-white" : "bg-white/70 text-ink/60"
            }`}
          >
            <span>{showing ? `“${c.phrase}”` : cupReady ? "Hantar sini" : "Lupa? Tanya balik"}</span>
            <span className="h-1 w-full overflow-hidden rounded-full bg-ink/10">
              <span className={`block h-full ${patience < 0.3 ? "bg-chili" : "bg-leaf"}`} style={{ width: `${patience * 100}%` }} />
            </span>
          </button>
        )}
      </div>
  );
}

// ---------- Anne (the player) ----------

const TRIP_MS = 1100;

function Anne({ serveEvent }: { serveEvent: Props["serveEvent"] }) {
  const trip = useRef<{ table: number; start: number } | null>(null);
  const lastId = useRef<number | null>(null);

  useFrame(() => {
    if (serveEvent && serveEvent.id !== lastId.current) {
      lastId.current = serveEvent.id;
      trip.current = { table: serveEvent.table, start: Date.now() };
    }
  });

  const getPose = (): Pose => {
    const tr = trip.current;
    const home = { x: ANNE_HOME[0], z: ANNE_HOME[1], rotY: 0, walking: false, seated: false };
    if (!tr) return home;
    const t = (Date.now() - tr.start) / TRIP_MS;
    if (t >= 1) {
      trip.current = null;
      return home;
    }
    const [x, z] = TABLES[tr.table];
    const pts = [new THREE.Vector2(...ANNE_HOME), new THREE.Vector2(0, z - 0.1), new THREE.Vector2(x * 0.55, z - 0.1)];
    // Out and back: first half carries the tray, second half returns empty-handed
    const out = t < 0.5;
    const { pos, dir } = samplePath(out ? pts : [...pts].reverse(), out ? t * 2 : (t - 0.5) * 2);
    return { x: pos.x, z: pos.y, rotY: Math.atan2(dir.x, dir.y), walking: true, seated: false, carrying: out };
  };

  return <Person look={ANNE_LOOK} getPose={getPose} />;
}

// ---------- Static set ----------

function Table({ index, pos: [x, z], onTap }: { index: number; pos: [number, number]; onTap: () => void }) {
  const stool = index % 2 === 0 ? "#d8352a" : "#2f6fd6";
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <Cyl top={0.62} bottom={0.62} height={0.05} position={[0, 0.76, 0]} color="#d3d7db" segments={28} />
      <Cyl top={0.05} bottom={0.05} height={0.72} position={[0, 0.38, 0]} color="#9ea4aa" />
      <Cyl top={0.3} bottom={0.32} height={0.04} position={[0, 0.02, 0]} color="#9ea4aa" />
      {/* Customer stool and two decorative ones */}
      <Stool position={[0, 0, SEAT_OFFSET]} color={stool} />
      <Stool position={[0.8, 0, 0.1]} color={stool} />
      <Stool position={[-0.8, 0, 0.1]} color={stool} />
      {/* Generous invisible hit area for fat fingers */}
      <mesh position={[0, 0.8, -0.3]} visible={false}>
        <boxGeometry args={[1.8, 1.8, 2]} />
      </mesh>
    </group>
  );
}

function Stool({ color, ...props }: { color: string; position: [number, number, number] }) {
  return (
    <group {...props}>
      <Cyl top={0.2} bottom={0.25} height={0.46} position={[0, 0.23, 0]} color={color} />
    </group>
  );
}

const Shop = memo(function Shop() {
  const sign = useMemo(() => signTexture(), []);
  return (
    <group>
      {/* Floor, five-foot way and road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.6]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshToonMaterial color="#e9e3d3" gradientMap={toonGradient()} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 5.5]} receiveShadow>
        <planeGeometry args={[30, 5]} />
        <meshToonMaterial color="#5b6066" gradientMap={toonGradient()} />
      </mesh>
      {[-6, -3, 0, 3, 6].map((x) => (
        <Box key={x} size={[1.4, 0.01, 0.12]} position={[x, 0, 5.6]} color="#f4f1ea" outline={false} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[40, 30]} />
        <meshToonMaterial color="#86c27a" gradientMap={toonGradient()} />
      </mesh>

      {/* Back wall with green tiles */}
      <Box size={[9, 3.4, 0.2]} position={[0, 1.7, -5.1]} color="#f4efe4" />
      <Box size={[9, 1.1, 0.05]} position={[0, 0.55, -4.98]} color="#3f9a76" outline={false} />
      <mesh position={[0, 3.05, -4.98]}>
        <planeGeometry args={[5.2, 0.9]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <Box size={[0.3, 3.4, 0.3]} position={[-4.35, 1.7, -4.9]} color="#e0d8c6" />
      <Box size={[0.3, 3.4, 0.3]} position={[4.35, 1.7, -4.9]} color="#e0d8c6" />

      {/* Counter, teh urn, roti display */}
      <RBox size={[4.6, 1, 0.8]} radius={0.04} position={[0, 0.5, -3.7]} color="#2f8f86" />
      <Box size={[4.7, 0.06, 0.9]} position={[0, 1.03, -3.7]} color="#cfd4d8" />
      <Cyl top={0.24} bottom={0.24} height={0.55} position={[-1.6, 1.33, -3.75]} color="#c3c8cd" />
      <Cyl top={0.05} bottom={0.05} height={0.12} position={[-1.6, 1.66, -3.75]} color="#3a3a3a" />
      <Box size={[1.1, 0.5, 0.55]} position={[1.4, 1.31, -3.75]} color="#bfe6ef" />
      {[-0.2, 0.1, 0.4].map((x) => (
        <Cyl key={x} top={0.12} bottom={0.12} height={0.03} position={[1.1 + x * 1.2, 1.1, -3.7]} color="#e7b45c" outline={false} />
      ))}
      {[-0.6, -0.35, -0.1].map((x) => (
        <Cyl key={x} top={0.07} bottom={0.055} height={0.16} position={[x, 1.14, -3.6]} color="#c9965f" />
      ))}

      {/* Plants and a ceiling-less fan pole for mamak vibes */}
      <Plant position={[-3.9, 0, 2.9]} />
      <Plant position={[3.9, 0, 2.9]} />
      <Plant position={[-3.9, 0, -4.4]} />
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

function signTexture() {
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
