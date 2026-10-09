"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import * as THREE from "three";
import { emit } from "@/core/events";
import { recordCatPet } from "@/core/profile";
import { sfx } from "@/shared/audio";
import { Box, RBox } from "@/shared/three/toon";
import { dynamicColliders } from "./colliders";
import { player } from "./traffic";

// ---------- Cast of street cats ----------

type Coat = "oyen" | "calico" | "black" | "tuxedo" | "white";
type Region = { minX: number; maxX: number; minZ: number; maxZ: number };

export type CatInfo = { id: string; name: string; coat: Coat; home: Region };

// Each cat keeps to its own stretch of sidewalk
export const CATS: CatInfo[] = [
  { id: "oyen", name: "Oyen", coat: "oyen", home: { minX: 10, maxX: 24, minZ: -6.2, maxZ: -3.6 } },
  { id: "comot", name: "Comot", coat: "calico", home: { minX: -30, maxX: -12, minZ: -6.2, maxZ: -3.6 } },
  { id: "tompok", name: "Tompok", coat: "tuxedo", home: { minX: 27, maxX: 36, minZ: 3.6, maxZ: 6.2 } },
  { id: "hitam", name: "Si Hitam", coat: "black", home: { minX: -30, maxX: -10, minZ: 3.6, maxZ: 6.2 } },
  { id: "putih", name: "Putih", coat: "white", home: { minX: 3.6, maxX: 6.2, minZ: -30, maxZ: -10 } },
];

type Mode = "walk" | "sit" | "groom" | "sleep" | "petted" | "follow";
type CatState = {
  x: number;
  z: number;
  rot: number;
  mode: Mode;
  until: number;
  tx: number;
  tz: number;
  region: Region;
  nextMeow: number;
  meowUntil: number;
  heartsUntil: number;
  followUntil: number;
};

const now = () => performance.now() / 1000;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// Mutable simulation state shared with the hub (petting) and the minimap
let state: CatState[] | null = null;
export function catStates() {
  return (state ??= CATS.map((c) => {
    const x = rnd(c.home.minX, c.home.maxX);
    const z = rnd(c.home.minZ, c.home.maxZ);
    return { x, z, rot: rnd(0, Math.PI * 2), mode: "sit" as Mode, until: rnd(1, 4), tx: x, tz: z, region: c.home, nextMeow: rnd(3, 12), meowUntil: 0, heartsUntil: 0, followUntil: 0 };
  }));
}

// Roads are off limits: main road |z| < 3.2, cross road |x| < 3.2
const onRoad = (x: number, z: number) => Math.abs(z) < 3.2 || Math.abs(x) < 3.2;

const PET_KEY = "dotkod-play:cats-petted";
export function petCount() {
  try {
    return Number(localStorage.getItem(PET_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Called by the hub's "Usap" prompt
export function petCat(index: number) {
  const c = catStates()[index];
  const t = now();
  c.mode = "petted";
  c.until = t + 2.4;
  c.heartsUntil = t + 2.4;
  c.followUntil = t + 2.4 + 20;
  c.rot = Math.atan2(player.x - c.x, player.z - c.z);
  player.crouchUntil = Date.now() + 1400;
  sfx.purr(2.2);
  setTimeout(() => sfx.meow(0.9), 500);
  const n = petCount() + 1;
  try {
    localStorage.setItem(PET_KEY, String(n));
  } catch {}
  recordCatPet();
  emit({ type: "catPetted", id: CATS[index].id });
  return n;
}

function chooseNext(c: CatState, t: number) {
  const r = Math.random();
  if (r < 0.45) {
    c.mode = "walk";
    c.tx = rnd(c.region.minX, c.region.maxX);
    c.tz = rnd(c.region.minZ, c.region.maxZ);
    c.until = t + 12;
  } else if (r < 0.7) {
    c.mode = "sit";
    c.until = t + rnd(3, 7);
  } else if (r < 0.85) {
    c.mode = "groom";
    c.until = t + rnd(2.5, 5);
  } else {
    c.mode = "sleep";
    c.until = t + rnd(8, 15);
  }
}

// One frame loop drives every cat: behaviour, meows, nearest-cat detection, colliders
export const Cats = memo(function Cats({ onNear }: { onNear: (index: number | null) => void }) {
  const near = useRef<number | null>(null);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = now();
    const all = catStates();
    let closest: number | null = null;
    let closestD = 2.2;
    dynamicColliders.cats.length = 0;

    all.forEach((c, i) => {
      const pd = Math.hypot(player.x - c.x, player.z - c.z);

      if (c.mode === "petted" && t > c.until) c.mode = "follow";
      if (c.mode === "follow" && (t > c.followUntil || pd > 16)) {
        // Settle wherever we ended up
        c.region = { minX: c.x - 5, maxX: c.x + 5, minZ: c.z < 0 ? -6.2 : 3.6, maxZ: c.z < 0 ? -3.6 : 6.2 };
        if (Math.abs(c.x) < 6.5) c.region = { minX: c.x < 0 ? -6.2 : 3.6, maxX: c.x < 0 ? -3.6 : 6.2, minZ: c.z - 5, maxZ: c.z + 5 };
        chooseNext(c, t);
      }
      if (c.mode !== "follow" && c.mode !== "petted" && t > c.until) chooseNext(c, t);
      // Curious: a wandering or grooming cat stops and watches you come closer (and wakes if you're right there)
      if (pd < 3 && (c.mode === "walk" || c.mode === "groom" || (c.mode === "sleep" && pd < 1.5))) {
        c.mode = "sit";
        c.until = t + 4;
      }
      if (pd < 3 && c.mode === "sit") c.rot = Math.atan2(player.x - c.x, player.z - c.z);

      // Movement
      let speed = 0;
      if (c.mode === "walk") {
        speed = 0.9;
        if (Math.hypot(c.tx - c.x, c.tz - c.z) < 0.2) chooseNext(c, t);
      } else if (c.mode === "follow") {
        // Trot after the player, keeping a step behind; wait at the curb rather than crossing
        const bx = player.x - Math.sin(player.rot) * 1.1;
        const bz = player.z - Math.cos(player.rot) * 1.1;
        c.tx = bx;
        c.tz = bz;
        speed = Math.hypot(bx - c.x, bz - c.z) > 0.5 ? 2.6 : 0;
      }
      if (speed > 0) {
        const dx = c.tx - c.x;
        const dz = c.tz - c.z;
        const d = Math.hypot(dx, dz) || 1;
        const nx = c.x + (dx / d) * speed * dt;
        const nz = c.z + (dz / d) * speed * dt;
        if (!onRoad(nx, nz)) {
          c.x = nx;
          c.z = nz;
          c.rot = Math.atan2(dx, dz);
        } else if (c.mode === "walk") chooseNext(c, t);
      }
      (c as CatState & { moving?: boolean }).moving = speed > 0;

      // The odd meow, louder when you're close; sleeping cats stay quiet
      if (t > c.nextMeow) {
        c.nextMeow = t + rnd(7, 16);
        if (c.mode !== "sleep" && pd < 12) {
          sfx.meow(1 - pd / 12);
          c.meowUntil = t + 1.1;
        }
      }

      dynamicColliders.cats.push({ x: c.x, z: c.z, r: 0.3 });
      if (pd < closestD) {
        closestD = pd;
        closest = i;
      }
    });

    if (closest !== near.current) {
      near.current = closest;
      onNear(closest);
    }
  });

  return (
    <>
      {CATS.map((c, i) => (
        <Cat key={c.id} index={i} coat={c.coat} />
      ))}
    </>
  );
});

// ---------- Cat model ----------

const COATS: Record<Coat, { body: string; patch?: string; chest?: string; eyes: string }> = {
  oyen: { body: "#f28c28", patch: "#d9731a", eyes: "#4caf62" },
  calico: { body: "#f7f3ea", patch: "#f28c28", chest: "#2a2a2a", eyes: "#d9a01a" },
  black: { body: "#2a2a2a", eyes: "#f2d24b" },
  tuxedo: { body: "#2a2a2a", chest: "#f7f3ea", eyes: "#4caf62" },
  white: { body: "#f4f4f0", eyes: "#5ab0e0" },
};

let meowTex: THREE.CanvasTexture | null = null;
let heartTex: THREE.CanvasTexture | null = null;
function label(text: string, size: number, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.font = `900 ${size}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 10;
  g.strokeStyle = "#1f1a17";
  g.strokeText(text, 128, 64);
  g.fillStyle = color;
  g.fillText(text, 128, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Cat({ index, coat }: { index: number; coat: Coat }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const bubble = useRef<THREE.Mesh>(null);
  const hearts = useRef<THREE.Group>(null);
  const col = COATS[coat];
  meowTex ??= label("Meow~", 64, "#ffffff");
  heartTex ??= label("❤", 96, "#ff5a7a");

  useFrame(({ camera, clock }) => {
    const c = catStates()[index] as CatState & { moving?: boolean };
    const t = clock.elapsedTime;
    if (!root.current || !body.current || !head.current || !tail.current) return;
    root.current.position.set(c.x, 0, c.z);
    root.current.rotation.y = c.rot;

    const moving = !!c.moving;
    const sitting = c.mode === "sit" || c.mode === "groom" || c.mode === "petted" || (c.mode === "follow" && !moving);
    const sleeping = c.mode === "sleep";
    // Body: level when walking, front raised when sitting, flat and low when asleep
    body.current.rotation.x = sitting ? -0.55 : 0;
    body.current.position.y = sleeping ? -0.12 : sitting ? 0.04 : Math.abs(Math.sin(t * 12)) * 0.015;
    head.current.rotation.x = sleeping ? 0.5 : c.mode === "groom" ? 0.5 + Math.sin(t * 6) * 0.25 : c.mode === "petted" ? -0.3 : 0;
    head.current.rotation.z = c.mode === "petted" ? Math.sin(t * 5) * 0.2 : 0;
    tail.current.rotation.x = sleeping ? 1.2 : -0.9 + Math.sin(t * (c.mode === "petted" ? 9 : 2)) * 0.25;
    legs.current.forEach((l, i) => {
      if (!l) return;
      l.visible = !sleeping;
      l.rotation.x = moving ? Math.sin(t * 14 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0;
    });

    const tt = now();
    if (bubble.current) {
      bubble.current.visible = tt < c.meowUntil;
      bubble.current.quaternion.copy(camera.quaternion);
    }
    if (hearts.current) {
      const on = tt < c.heartsUntil;
      hearts.current.visible = on;
      hearts.current.children.forEach((h, i) => {
        const k = ((tt * 0.9 + i * 0.33) % 1 + 1) % 1;
        h.position.set((i - 1) * 0.18, 0.7 + k * 0.6, 0);
        h.scale.setScalar(0.25 + k * 0.15);
        h.quaternion.copy(camera.quaternion);
      });
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <RBox size={[0.26, 0.22, 0.5]} radius={0.08} position={[0, 0.3, 0]} color={col.body} />
        {col.patch && <Box size={[0.2, 0.05, 0.18]} position={[0.03, 0.42, -0.08]} color={col.patch} outline={false} />}
        {col.chest && <Box size={[0.2, 0.14, 0.05]} position={[0, 0.3, 0.25]} color={col.chest} outline={false} />}
        {/* Legs pivot at the hips/shoulders */}
        {[
          [-0.08, 0.17],
          [0.08, 0.17],
          [-0.08, -0.17],
          [0.08, -0.17],
        ].map(([x, z], i) => (
          <group key={i} ref={(g) => void (legs.current[i] = g)} position={[x, 0.22, z]}>
            <Box size={[0.07, 0.22, 0.07]} position={[0, -0.11, 0]} color={col.chest && i < 2 ? col.chest : col.body} outline={false} />
          </group>
        ))}
        <group ref={tail} position={[0, 0.36, -0.24]}>
          <Box size={[0.06, 0.06, 0.34]} position={[0, 0, -0.16]} color={col.patch ?? col.body} />
        </group>
        {/* Head rides on the body so tilting (sitting, napping) keeps it attached */}
        <group ref={head} position={[0, 0.42, 0.28]}>
          <RBox size={[0.24, 0.2, 0.2]} radius={0.06} color={col.body} />
          {[-0.07, 0.07].map((x) => (
            <mesh key={x} position={[x, 0.13, 0]}>
              <coneGeometry args={[0.05, 0.1, 4]} />
              <meshToonMaterial color={col.body} />
            </mesh>
          ))}
          <Box size={[0.04, 0.045, 0.01]} position={[-0.055, 0.02, 0.101]} color={col.eyes} outline={false} />
          <Box size={[0.04, 0.045, 0.01]} position={[0.055, 0.02, 0.101]} color={col.eyes} outline={false} />
          <Box size={[0.03, 0.02, 0.01]} position={[0, -0.03, 0.102]} color="#e889a0" outline={false} />
        </group>
      </group>
      <mesh ref={bubble} position={[0, 0.95, 0]} visible={false}>
        <planeGeometry args={[0.9, 0.45]} />
        <meshBasicMaterial map={meowTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={hearts} visible={false}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <planeGeometry args={[1, 0.5]} />
            <meshBasicMaterial map={heartTex} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
