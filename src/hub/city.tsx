"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { etaLabel, nextArrivals } from "@/content/transit/bus-routes";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { Ball, Box, Cyl, RBox, ToonMaterial, toonGradient } from "@/shared/three/toon";
import { ROAD_STRIPS, SPINE_EDGES, SPINE_NODES, WALK_PATHS, WALK_PATH_HALF } from "@/world/walk-spine";
import { BUS_STOP, STALL, streetSpots } from "./colliders";
import { view } from "./controls";
import { type Building, BUILDINGS, doorSpot, EXTENT, footprint, ROAD_HALF, WALK_HALF } from "./world-data";

export const City = memo(function City({ onBuilding }: { onBuilding: (b: Building) => void }) {
  return (
    <group>
      <Ground />
      <Roads />
      <StreetProps />
      <BusStop />
      <NasiLemakStall />
      {BUILDINGS.map((b) => (
        <BuildingMesh key={b.id} b={b} onTap={() => onBuilding(b)} />
      ))}
    </group>
  );
});

// ---------- Ground, roads, sidewalks ----------

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[320, 320]} />
        <meshToonMaterial color="#86c27a" gradientMap={toonGradient()} />
      </mesh>
      {/* Sungai Lepak + Masjid Lepak (Phase 3 Pusat expand stub) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-31, 0.02, 32]} receiveShadow>
        <planeGeometry args={[14, 52]} />
        <meshToonMaterial color="#6ec4e8" gradientMap={toonGradient()} />
      </mesh>
      <group position={[-28, 0, 22]}>
        <RBox size={[10, 0.4, 10]} radius={0.2} position={[0, 0.2, 0]} color="#e8eef4" />
        <Ball radius={2.2} position={[0, 2.8, 0]} color="#1f8a4c" />
        <Ball radius={1.6} position={[0, 3.8, 0]} color="#248a4c" />
      </group>
    </>
  );
}

const ROAD = "#4f545a";
const WALK = "#d9d5cc";
const PATH = "#cfc8bb";
const CURB = "#b9b4a8";
const LEN = EXTENT * 2 + 20;

function Strip({
  w,
  d,
  x = 0,
  z = 0,
  y = 0,
  color,
  offset = 0,
}: {
  w: number;
  d: number;
  x?: number;
  z?: number;
  y?: number;
  color: string;
  /** polygonOffset units — separates coplanar crossing strips */
  offset?: number;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshToonMaterial
        color={color}
        gradientMap={toonGradient()}
        polygonOffset={offset !== 0}
        polygonOffsetFactor={offset}
        polygonOffsetUnits={offset}
      />
    </mesh>
  );
}

/** Pedestrian alleys (narrow, under sidewalks). */
function CityWalkPaths() {
  return (
    <>
      {WALK_PATHS.map((s, i) => {
        if (s.axis === "x") {
          const w = Math.abs(s.x1 - s.x0);
          const cx = (s.x0 + s.x1) / 2;
          return <Strip key={`p${i}`} w={w} d={WALK_PATH_HALF * 2} x={cx} z={s.z} y={0.003} color={PATH} />;
        }
        const d = Math.abs(s.z1 - s.z0);
        const cz = (s.z0 + s.z1) / 2;
        return <Strip key={`p${i}`} w={WALK_PATH_HALF * 2} d={d} x={s.x} z={cz} y={0.003} color={PATH} />;
      })}
    </>
  );
}

/** Soft pads at L / T junctions so 3D corners aren’t raw rectangle mitres. */
function junctionPads(): { x: number; z: number }[] {
  const adj: Record<string, string[]> = {};
  for (const id of Object.keys(SPINE_NODES)) adj[id] = [];
  for (const e of SPINE_EDGES) {
    adj[e.a].push(e.b);
    adj[e.b].push(e.a);
  }
  const out: { x: number; z: number }[] = [];
  for (const [id, nbrs] of Object.entries(adj)) {
    if (nbrs.length < 2) continue;
    const n = SPINE_NODES[id];
    let hasX = false;
    let hasZ = false;
    for (const nid of nbrs) {
      const o = SPINE_NODES[nid];
      if (Math.abs(o.z - n.z) < 0.05) hasX = true;
      if (Math.abs(o.x - n.x) < 0.05) hasZ = true;
    }
    if (hasX && hasZ) out.push({ x: n.x, z: n.z });
  }
  return out;
}

/** Full-city asphalt + sidewalks from ROAD_STRIPS. Walks under roads; Z-axis asphalt slightly above X (clean junctions). */
function CityRoadStrips() {
  const walks: ReactNode[] = [];
  const roads: ReactNode[] = [];
  ROAD_STRIPS.forEach((s, i) => {
    if (s.axis === "x") {
      const x0 = Math.min(s.x0, s.x1);
      const x1 = Math.max(s.x0, s.x1);
      const w = x1 - x0;
      const cx = (x0 + x1) / 2;
      walks.push(<Strip key={`w${i}`} w={w} d={WALK_HALF * 2} x={cx} z={s.z} y={0.004} color={WALK} />);
      roads.push(<Strip key={`r${i}`} w={w} d={ROAD_HALF * 2} x={cx} z={s.z} y={0.02} color={ROAD} offset={-1} />);
      return;
    }
    const z0 = Math.min(s.z0, s.z1);
    const z1 = Math.max(s.z0, s.z1);
    const d = z1 - z0;
    const cz = (z0 + z1) / 2;
    walks.push(<Strip key={`w${i}`} w={WALK_HALF * 2} d={d} x={s.x} z={cz} y={0.004} color={WALK} />);
    roads.push(<Strip key={`r${i}`} w={ROAD_HALF * 2} d={d} x={s.x} z={cz} y={0.028} color={ROAD} offset={-2} />);
  });
  const pads = junctionPads();
  return (
    <>
      <CityWalkPaths />
      {walks}
      {pads.map((p, i) => (
        <Cyl
          key={`jw${i}`}
          top={WALK_HALF}
          bottom={WALK_HALF}
          height={0.01}
          position={[p.x, 0.006, p.z]}
          color={WALK}
          outline={false}
        />
      ))}
      {roads}
      {pads.map((p, i) => (
        <Cyl
          key={`jr${i}`}
          top={ROAD_HALF}
          bottom={ROAD_HALF}
          height={0.01}
          position={[p.x, 0.032, p.z]}
          color={ROAD}
          outline={false}
        />
      ))}
    </>
  );
}

function Roads() {
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let p = -EXTENT; p <= EXTENT; p += 4) if (Math.abs(p) > WALK_HALF + 3) out.push(p);
    return out;
  }, []);
  const zebra = [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4];
  const crossAt = WALK_HALF + 1.6;
  return (
    <group>
      <CityRoadStrips />
      {/* Pusat junction curbs / dashes / zebra (local polish on the main cross) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[LEN, 0.12, 0.18]} position={[0, 0.06, s * ROAD_HALF]} color={CURB} outline={false} />
          <Box size={[0.18, 0.12, LEN]} position={[s * ROAD_HALF, 0.06, 0]} color={CURB} outline={false} />
        </group>
      ))}
      {dashes.map((p) => (
        <group key={p}>
          <Box size={[2, 0.02, 0.15]} position={[p, 0.03, 0]} color="#f2d24b" outline={false} />
          <Box size={[0.15, 0.02, 2]} position={[0, 0.03, p]} color="#f2d24b" outline={false} />
        </group>
      ))}
      {[-1, 1].map((s) =>
        zebra.map((o) => (
          <group key={`${s}${o}`}>
            <Box size={[1.4, 0.02, 0.45]} position={[s * crossAt, 0.031, o]} color="#f4f1ea" outline={false} />
            <Box size={[0.45, 0.02, 1.4]} position={[o, 0.031, s * crossAt]} color="#f4f1ea" outline={false} />
          </group>
        )),
      )}
    </group>
  );
}

// ---------- Lamps and trees ----------

const StreetProps = memo(function StreetProps() {
  const spots = useMemo(() => streetSpots(), []);
  return (
    <>
      {spots.map((p, i) =>
        p.kind === "lamp" ? (
          <group key={i} position={[p.x, 0, p.z]}>
            <Cyl top={0.07} bottom={0.09} height={4.2} position={[0, 2.1, 0]} color="#6b7178" outline={false} />
            <Box size={[0.8, 0.14, 0.3]} position={[0, 4.2, 0]} color="#6b7178" outline={false} />
            <Box size={[0.5, 0.06, 0.24]} position={[0, 4.12, 0]} color="#fff3c4" outline={false} />
          </group>
        ) : (
          <group key={i} position={[p.x, 0, p.z]}>
            <Cyl top={0.14} bottom={0.18} height={1.8} position={[0, 0.9, 0]} color="#8a5a3b" />
            <Ball radius={1.1} position={[0, 2.5, 0]} color="#4caf62" />
            <Ball radius={0.8} position={[0.5, 3.2, 0.2]} color="#5cbf70" />
          </group>
        ),
      )}
    </>
  );
});

// ---------- Street furniture ----------

// Bus shelter: roof, back panel, bench and a tall "BAS" blade sign with live ETAs.
let basCanvas: HTMLCanvasElement | null = null;
let basTex: THREE.CanvasTexture | null = null;
let basPaintedAt = -1;

function paintBasSign(now = new Date()) {
  if (!basCanvas) {
    basCanvas = document.createElement("canvas");
    basCanvas.width = 128;
    basCanvas.height = 256;
  }
  const c = basCanvas;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f5fa8";
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = "#fcd34d";
  g.fillRect(8, 8, 112, 40);
  g.fillStyle = "#1f1a17";
  g.font = "bold 32px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("BAS", 64, 28);
  g.fillStyle = "#ffffff";
  g.font = "bold 14px system-ui, sans-serif";
  g.fillText("RapidLepak", 64, 62);

  const arrivals = nextArrivals(now);
  let y = 95;
  for (const { route, eta } of arrivals) {
    g.fillStyle = route.color;
    g.fillRect(10, y - 14, 108, 32);
    g.fillStyle = "#ffffff";
    g.font = "bold 16px system-ui, sans-serif";
    g.textAlign = "left";
    g.fillText(route.id, 18, y + 2);
    g.textAlign = "right";
    g.fillText(etaLabel(eta, "ms"), 110, y + 2);
    y += 40;
  }
  g.fillStyle = "#fcd34d";
  g.font = "22px system-ui";
  g.textAlign = "center";
  g.fillText("🚌", 64, 230);

  if (!basTex) {
    basTex = new THREE.CanvasTexture(c);
    basTex.colorSpace = THREE.SRGBColorSpace;
  }
  basTex.needsUpdate = true;
  basPaintedAt = Math.floor(now.getTime() / 15_000);
  return basTex;
}

const BusStop = memo(function BusStop() {
  const { x, z } = BUS_STOP;
  const sign = useMemo(() => paintBasSign(), []);
  useFrame(() => {
    const slot = Math.floor(Date.now() / 15_000);
    if (slot !== basPaintedAt) paintBasSign();
  });
  return (
    <group position={[x, 0, z]}>
      <Box size={[4.2, 0.14, 1.8]} position={[0, 2.55, 0]} color="#1f5fa8" />
      <Box size={[4.0, 0.06, 1.6]} position={[0, 2.64, 0]} color="#fcd34d" outline={false} />
      <Box size={[4.2, 2.3, 0.08]} position={[0, 1.3, 0.75]} color="#bfe6ef" />
      {[-2, 2].map((dx) => (
        <Box key={dx} size={[0.1, 2.5, 0.1]} position={[dx, 1.25, -0.6]} color="#6b7178" outline={false} />
      ))}
      <Box size={[3, 0.1, 0.5]} position={[0.3, 0.5, 0.4]} color="#b9773f" />
      <Box size={[3, 0.45, 0.08]} position={[0.3, 0.3, 0.62]} color="#6b7178" outline={false} />
      <group position={[-2.8, 0, 0.2]}>
        <Cyl top={0.07} bottom={0.09} height={3.4} position={[0, 1.7, 0]} color="#374151" outline={false} />
        <mesh position={[0, 3.55, 0]}>
          <planeGeometry args={[1.1, 2.2]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        <mesh position={[0, 3.55, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.1, 2.2]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
});

// Nasi lemak cart with a big umbrella and banana-leaf packets
const NasiLemakStall = memo(function NasiLemakStall() {
  const { x, z } = STALL;
  return (
    <group position={[x, 0, z]}>
      <Box size={[1.8, 0.9, 0.9]} position={[0, 0.55, 0]} color="#c8372b" />
      <Box size={[1.9, 0.08, 1.0]} position={[0, 1.02, 0]} color="#e3e1dc" />
      {[-0.6, -0.2, 0.2, 0.6].map((dx) => (
        <Box key={dx} size={[0.26, 0.12, 0.22]} position={[dx, 1.12, 0.15]} rotation={[0, dx, 0]} color="#3f9a4a" />
      ))}
      <Cyl top={0.15} bottom={0.15} height={0.25} position={[-0.55, 1.2, -0.25]} color="#f4f1ea" />
      {[-0.7, 0.7].map((dx) => (
        <Cyl key={dx} top={0.18} bottom={0.18} height={0.1} position={[dx, 0.12, 0.45]} rotation={[0, 0, Math.PI / 2]} color="#1a1a1a" outline={false} />
      ))}
      <Cyl top={0.03} bottom={0.03} height={2.6} position={[0.9, 1.3, -0.3]} color="#6b7178" outline={false} />
      <mesh position={[0.9, 2.65, -0.3]}>
        <coneGeometry args={[1.5, 0.6, 10]} />
        <meshToonMaterial color="#f2b33d" gradientMap={toonGradient()} />
      </mesh>
      <Box size={[1.4, 0.35, 0.05]} position={[0, 1.5, 0.46]} color="#fbf3e4" outline={false} />
    </group>
  );
});

// ---------- Buildings ----------

function BuildingMesh({ b, onTap }: { b: Building; onTap: () => void }) {
  const f = footprint(b);
  const facade = facadeTexture(b);
  const frontZ = f.front + f.facing * 0.01;
  const group = useRef<THREE.Group>(null);
  // Cutaway: a building between the camera and the street hides itself so it never blocks the view
  useFrame(({ camera }) => {
    if (!group.current) return;
    if (!view.cutaway) {
      group.current.visible = true;
      return;
    }
    const near = Math.abs(camera.position.x - b.x) < b.w / 2 + 5;
    const between = near && (b.side === "south" ? camera.position.z > f.minZ - 1.5 : camera.position.z < f.maxZ + 1.5);
    group.current.visible = !between;
  });
  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <Box size={[b.w, b.h, b.d]} position={[f.cx, b.h / 2, f.cz]} color={b.color} />
      {/* Painted facade on the road-facing side */}
      <mesh position={[b.x, b.h / 2, frontZ]} rotation={[0, f.facing > 0 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[b.w, b.h]} />
        <meshToonMaterial map={facade} gradientMap={toonGradient()} />
      </mesh>
      {/* Roof parapet */}
      <Box size={[b.w + 0.3, 0.4, b.d + 0.3]} position={[f.cx, b.h + 0.2, f.cz]} color={shade(b.color)} />
      {/* Five-foot way awning */}
      <Box size={[b.w, 0.18, 1.6]} position={[b.x, b.kind === "mall" ? 4.2 : 3.1, f.front + f.facing * 0.8]} color={b.kind === "mamak" ? "#2f8f86" : shade(b.color)} />
      {b.kind === "mamak" && <MamakFront b={b} />}
      {b.kind === "lrt" && <LrtPlatform b={b} />}
      {(b.game || b.soon || b.lrt || b.interior) && <FloatingLabel b={b} />}
    </group>
  );
}

// Outdoor tables, diners and a teh tarik counter in front of Restoran Anne Maju
function MamakFront({ b }: { b: Building }) {
  const f = footprint(b);
  const z = f.front + f.facing * 1.1;
  const diners: { look: Look; x: number }[] = useMemo(
    () => [
      { look: { skin: "#c98d60", shirt: "#3f8fd2", pants: "#2a2a33", headwear: "songkok", hair: "#141414" }, x: b.x - 3.2 },
      { look: { skin: "#e2ad84", shirt: "#f3b6c9", pants: "#f3b6c9", headwear: "tudung", hair: "#9fd1e8", dress: true }, x: b.x + 3.2 },
    ],
    [b.x],
  );
  return (
    <group>
      {[b.x - 3.2, b.x + 3.2].map((x) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl top={0.55} bottom={0.55} height={0.05} position={[0, 0.76, 0]} color="#d3d7db" segments={24} />
          <Cyl top={0.05} bottom={0.05} height={0.72} position={[0, 0.38, 0]} color="#9ea4aa" />
          <Cyl top={0.18} bottom={0.22} height={0.46} position={[0.75, 0.23, 0]} color="#d8352a" />
          <Cyl top={0.18} bottom={0.22} height={0.46} position={[-0.75, 0.23, 0]} color="#2f6fd6" />
          <Cyl top={0.07} bottom={0.055} height={0.16} position={[0.1, 0.87, 0.1]} color="#c9965f" />
        </group>
      ))}
      {diners.map((d) => (
        <SeatedDiner key={d.x} look={d.look} x={d.x - 0.75} z={z} />
      ))}
    </group>
  );
}

function SeatedDiner({ look, x, z }: { look: Look; x: number; z: number }) {
  const pose = useMemo<Pose>(() => ({ x, z, rotY: Math.PI / 2, walking: false, seated: true }), [x, z]);
  const getPose = useMemo(() => () => pose, [pose]);
  return <Person look={look} getPose={getPose} />;
}

// Elevated platform on pillars above the ticket hall, with a two-car train waiting at it
function LrtPlatform({ b }: { b: Building }) {
  const f = footprint(b);
  const y = b.h + 1.6; // platform deck height
  const len = b.w + 6;
  return (
    <group position={[b.x, 0, f.cz]}>
      {/* Guideway pillars running beyond the station */}
      {[-len / 2 + 2, -len / 4, len / 4, len / 2 - 2].map((x) => (
        <Box key={x} size={[0.9, y, 0.9]} position={[x, y / 2, 0]} color="#c9cdd2" />
      ))}
      <Box size={[len, 0.5, 3.4]} position={[0, y, 0]} color="#b9bec4" />
      {/* Platform canopy */}
      <Box size={[b.w, 0.25, 4.6]} position={[0, y + 3.1, 0]} color="#1f5fa8" />
      {[-b.w / 2 + 0.4, b.w / 2 - 0.4].map((x) => (
        <Box key={x} size={[0.25, 3, 0.25]} position={[x, y + 1.6, 1.9]} color="#9aa1a7" />
      ))}
      {/* Two-car train */}
      {[-2.3, 2.3].map((x) => (
        <group key={x} position={[x, y + 0.25, 0]}>
          <RBox size={[4.4, 2.1, 2.6]} radius={0.35} position={[0, 1.05, 0]} color="#f4f6f8" />
          <Box size={[4.42, 0.35, 2.62]} position={[0, 0.55, 0]} color="#1f5fa8" outline={false} />
          <Box size={[4.0, 0.7, 2.64]} position={[0, 1.45, 0]} color="#3e5566" outline={false} />
        </group>
      ))}
    </group>
  );
}

// A bobbing sign above game buildings: big emoji + title, always facing the camera
function FloatingLabel({ b }: { b: Building }) {
  const ref = useRef<THREE.Group>(null);
  const tex = labelTexture(b);
  const spot = doorSpot(b);
  useFrame(({ camera, clock }) => {
    if (!ref.current) return;
    ref.current.position.y = labelY(b) + Math.sin(clock.elapsedTime * 2) * 0.25;
    ref.current.quaternion.copy(camera.quaternion);
  });
  return (
    <>
      <group ref={ref} position={[b.x, labelY(b), footprint(b).cz]}>
        <mesh>
          <planeGeometry args={[6, 1.5]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      {(b.game || b.interior) && <DoorMarker x={spot.x} z={spot.z} />}
    </>
  );
}

// Float the label clear of the roof (or of the LRT platform canopy)
const labelY = (b: Building) => (b.kind === "lrt" ? b.h + 7.4 : b.h + 2.4);

// Pulsing ring + bouncing arrow on the doorstep of a playable building
function DoorMarker({ x, z }: { x: number; z: number }) {
  const arrow = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arrow.current) {
      arrow.current.position.y = 2.6 + Math.abs(Math.sin(t * 3)) * 0.5;
      arrow.current.rotation.y = t * 1.5;
    }
    if (ring.current) ring.current.scale.setScalar(1 + (t % 1.2) * 0.4);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.0, 1.25, 40]} />
        <meshBasicMaterial color="#fcd34d" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <group ref={arrow}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.45, 0.8, 4]} />
          <ToonMaterial color="#fcd34d" />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]} scale={1.08}>
          <coneGeometry args={[0.45, 0.8, 4]} />
          <meshBasicMaterial color="#151515" side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- Canvas textures (cached per building, never recreated) ----------

const textures = new Map<string, THREE.CanvasTexture>();

function cached(key: string, draw: (g: CanvasRenderingContext2D, c: HTMLCanvasElement) => void, w: number, h: number) {
  const hit = textures.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, c);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textures.set(key, tex);
  return tex;
}

function facadeTexture(b: Building) {
  const ppm = 48; // pixels per metre
  return cached(
    `facade:${b.id}`,
    (g, c) => {
      const W = c.width;
      const H = c.height;
      g.fillStyle = b.color;
      g.fillRect(0, 0, W, H);
      const ground = (b.kind === "mall" ? 4.2 : 3.1) * ppm; // ground floor height in px
      const shop = H - ground;

      // Upper floors: rows of windows
      g.fillStyle = "#3e5566";
      const rows = Math.max(1, Math.floor((shop - 1.6 * ppm) / (1.5 * ppm)));
      const cols = Math.max(2, Math.floor(b.w / 1.6));
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < cols; i++) {
          const x = ((i + 0.5) / cols) * W - 0.45 * ppm;
          const y = 0.5 * ppm + r * 1.5 * ppm;
          g.fillStyle = "#3e5566";
          g.fillRect(x, y, 0.9 * ppm, 1.0 * ppm);
          g.fillStyle = "rgba(255,255,255,0.35)";
          g.fillRect(x + 4, y + 4, 0.3 * ppm, 1.0 * ppm - 8);
        }
      }

      // Signboard band between floors
      const signY = shop - 1.25 * ppm;
      g.fillStyle = b.kind === "mamak" ? "#c62f25" : b.kind === "lrt" ? "#1f5fa8" : "#1f1a17";
      g.fillRect(0.3 * ppm, signY, W - 0.6 * ppm, 1.0 * ppm);
      g.fillStyle = b.kind === "mamak" ? "#f6d13a" : "#ffffff";
      g.textAlign = "center";
      g.textBaseline = "middle";
      let size = 0.7 * ppm;
      do {
        g.font = `900 ${size}px system-ui, sans-serif`;
        size -= 2;
      } while (g.measureText(b.sign).width > W - 1.2 * ppm && size > 10);
      g.fillText(b.sign, W / 2, signY + 0.5 * ppm);

      // Ground floor: open shopfront for the mamak, shutters for "coming soon", glass otherwise
      if (b.kind === "mamak") {
        g.fillStyle = "#3b2a20";
        g.fillRect(0.4 * ppm, shop + 0.15 * ppm, W - 0.8 * ppm, ground - 0.15 * ppm);
        g.fillStyle = "#2f8f86";
        g.fillRect(1.2 * ppm, H - 1.1 * ppm, W - 2.4 * ppm, 1.1 * ppm);
        g.fillStyle = "#cfd4d8";
        g.fillRect(1.2 * ppm, H - 1.15 * ppm, W - 2.4 * ppm, 0.12 * ppm);
      } else if (b.soon) {
        g.fillStyle = "#9aa1a7";
        g.fillRect(0.4 * ppm, shop + 0.15 * ppm, W - 0.8 * ppm, ground - 0.15 * ppm);
        g.strokeStyle = "#7d848b";
        g.lineWidth = 3;
        for (let y = shop + 0.3 * ppm; y < H; y += 0.25 * ppm) {
          g.beginPath();
          g.moveTo(0.4 * ppm, y);
          g.lineTo(W - 0.4 * ppm, y);
          g.stroke();
        }
        g.fillStyle = "#fcd34d";
        g.fillRect(W / 2 - 2.4 * ppm, shop + ground / 2 - 0.45 * ppm, 4.8 * ppm, 0.9 * ppm);
        g.fillStyle = "#1f1a17";
        g.font = `900 ${0.5 * ppm}px system-ui, sans-serif`;
        g.fillText("AKAN DATANG", W / 2, shop + ground / 2);
      } else {
        g.fillStyle = "#6f8fa3";
        g.fillRect(0.4 * ppm, shop + 0.15 * ppm, W - 0.8 * ppm, ground - 0.15 * ppm);
        g.fillStyle = "rgba(255,255,255,0.3)";
        for (let x = 1 * ppm; x < W - ppm; x += 2.2 * ppm) g.fillRect(x, shop + 0.4 * ppm, 0.25 * ppm, ground - 0.6 * ppm);
      }
    },
    Math.round(b.w * ppm),
    Math.round(b.h * ppm),
  );
}

function labelTexture(b: Building) {
  const info = b.game ?? b.soon ?? b.interior ?? { title: "Stesen LRT", emoji: "🚇" };
  const live = !!(b.game || b.lrt || b.interior);
  return cached(
    `label:${b.id}`,
    (g, c) => {
      const W = c.width;
      const H = c.height;
      g.fillStyle = "#1f1a17";
      g.beginPath();
      g.roundRect(8, 16, W - 16, H - 24, 40);
      g.fill();
      g.fillStyle = live ? "#fcd34d" : "#fbf3e4";
      g.beginPath();
      g.roundRect(8, 8, W - 16, H - 24, 40);
      g.fill();
      g.fillStyle = "#1f1a17";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "900 96px system-ui, sans-serif";
      g.fillText(`${info.emoji} ${info.title.toUpperCase()}`, W / 2, H / 2 - (live ? 6 : 26));
      if (!live) {
        g.font = "800 48px system-ui, sans-serif";
        g.fillStyle = "#c62f25";
        g.fillText("AKAN DATANG", W / 2, H / 2 + 50);
      }
    },
    1024,
    256,
  );
}

function shade(hex: string) {
  return "#" + new THREE.Color(hex).multiplyScalar(0.82).getHexString();
}
