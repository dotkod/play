"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { Ball, Box, Cyl, RBox, ToonMaterial, toonGradient } from "@/shared/three/toon";
import { streetSpots } from "./colliders";
import { type Building, BUILDINGS, doorSpot, EXTENT, footprint, ROAD_HALF, WALK_HALF } from "./world-data";

export const City = memo(function City({ onBuilding }: { onBuilding: (b: Building) => void }) {
  return (
    <group>
      <Ground />
      <Roads />
      <StreetProps />
      {BUILDINGS.map((b) => (
        <BuildingMesh key={b.id} b={b} onTap={() => onBuilding(b)} />
      ))}
    </group>
  );
});

// ---------- Ground, roads, sidewalks ----------

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshToonMaterial color="#86c27a" gradientMap={toonGradient()} />
    </mesh>
  );
}

const ROAD = "#4f545a";
const WALK = "#d9d5cc";
const CURB = "#b9b4a8";
const LEN = EXTENT * 2 + 20;

function Strip({ w, d, x = 0, z = 0, y = 0, color }: { w: number; d: number; x?: number; z?: number; y?: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshToonMaterial color={color} gradientMap={toonGradient()} />
    </mesh>
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
      {/* Sidewalks first, roads on top so the junction stays clean */}
      <Strip w={LEN} d={WALK_HALF * 2} y={0.005} color={WALK} />
      <Strip w={WALK_HALF * 2} d={LEN} y={0.006} color={WALK} />
      <Strip w={LEN} d={ROAD_HALF * 2} y={0.01} color={ROAD} />
      <Strip w={ROAD_HALF * 2} d={LEN} y={0.011} color={ROAD} />
      {/* Curbs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[LEN, 0.12, 0.18]} position={[0, 0.06, s * ROAD_HALF]} color={CURB} outline={false} />
          <Box size={[0.18, 0.12, LEN]} position={[s * ROAD_HALF, 0.06, 0]} color={CURB} outline={false} />
        </group>
      ))}
      {/* Centre dashes */}
      {dashes.map((p) => (
        <group key={p}>
          <Box size={[2, 0.02, 0.15]} position={[p, 0.02, 0]} color="#f2d24b" outline={false} />
          <Box size={[0.15, 0.02, 2]} position={[0, 0.02, p]} color="#f2d24b" outline={false} />
        </group>
      ))}
      {/* Zebra crossings on all four arms */}
      {[-1, 1].map((s) =>
        zebra.map((o) => (
          <group key={`${s}${o}`}>
            <Box size={[1.4, 0.02, 0.45]} position={[s * crossAt, 0.021, o]} color="#f4f1ea" outline={false} />
            <Box size={[0.45, 0.02, 1.4]} position={[o, 0.021, s * crossAt]} color="#f4f1ea" outline={false} />
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

// ---------- Buildings ----------

function BuildingMesh({ b, onTap }: { b: Building; onTap: () => void }) {
  const f = footprint(b);
  const facade = facadeTexture(b);
  const frontZ = f.front + f.facing * 0.01;
  const group = useRef<THREE.Group>(null);
  // Cutaway: a building between the camera and the street hides itself so it never blocks the view
  useFrame(({ camera }) => {
    if (!group.current) return;
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
      {(b.game || b.soon) && <FloatingLabel b={b} />}
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
      {b.game && <DoorMarker x={spot.x} z={spot.z} />}
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
  const info = b.game ?? b.soon!;
  const live = !!b.game;
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
