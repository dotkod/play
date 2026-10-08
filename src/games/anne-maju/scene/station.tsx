"use client";

import { OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import { type Cup, cupColor } from "../drinks";
import { type Lang, t } from "../strings";
import { currentStep, type Step } from "../state";
import { Box, Cyl, ToonMaterial, toonGradient } from "@/shared/three/toon";

type Kind = "mug" | "glass" | "teh" | "kopi" | "milo" | "nescafe" | "pekat" | "cair" | "none" | "sugar0" | "sugar1" | "sugar2";
type Option = { value: string; kind: Kind };

const OPTIONS: Record<Step, Option[]> = {
  temp: [
    { value: "panas", kind: "mug" },
    { value: "ais", kind: "glass" },
  ],
  base: [
    { value: "teh", kind: "teh" },
    { value: "kopi", kind: "kopi" },
    { value: "milo", kind: "milo" },
    { value: "nescafe", kind: "nescafe" },
  ],
  milk: [
    { value: "susu", kind: "pekat" },
    { value: "c", kind: "cair" },
    { value: "o", kind: "none" },
  ],
  sugar: [
    { value: "biasa", kind: "sugar2" },
    { value: "kurang", kind: "sugar1" },
    { value: "kosong", kind: "sugar0" },
  ],
};

const STREAM: Partial<Record<Kind, string>> = {
  teh: "#8f4a17",
  kopi: "#2a170c",
  milo: "#5a321d",
  nescafe: "#3a2213",
  pekat: "#f7efd9",
  cair: "#fbf6ea",
  sugar1: "#ffffff",
  sugar2: "#ffffff",
};

const CUP_POS = new THREE.Vector3(0, 0, 1.75);
const SHELF_Z = -0.35;
const FLY_MS = 700;
// World units the camera must always fit, so nothing is cropped on any panel size
const VIEW_W = 3.0;
const VIEW_H = 3.0;

type Fx = { id: number; kind: Kind; from: THREE.Vector3 };

// Memoised: the game ticks 10x a second, but the station only needs to update when the cup changes
export default memo(function DrinkStation({ cup, lang, onPick }: { cup: Cup; lang: Lang; onPick: (step: Step, value: string) => void }) {
  const step = currentStep(cup);
  const [fx, setFx] = useState<Fx | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const frameloop = useVisibleFrameloop(wrap);

  const pick = (opt: Option, from: THREE.Vector3) => {
    if (!step) return;
    setFx({ id: (fx?.id ?? 0) + 1, kind: opt.kind, from });
    onPick(step, opt.value);
  };

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas frameloop={frameloop} dpr={[1, 1.5]}>
        <Rig />
        <color attach="background" args={["#2f8f86"]} />
        <hemisphereLight args={["#fffaf0", "#7d6b55", 1.5]} />
        <directionalLight position={[2, 5, 4]} intensity={1.8} />
  
        <Backdrop />
        <Vessel cup={cup} />
        {/* Remount the shelf per step so each set of items pops in fresh */}
        <Shelf key={step ?? "done"} options={step ? OPTIONS[step] : []} lang={lang} onPick={pick} />
        {!step && <DoneSign text={t(lang).ready} />}
        {fx && <PourFx key={fx.id} fx={fx} />}
      </Canvas>
    </div>
  );
});

function Rig() {
  const size = useThree((st) => st.size);
  const zoom = Math.min(size.width / VIEW_W, size.height / VIEW_H);
  return <OrthographicCamera makeDefault zoom={zoom} position={[0, 3.4, 6.5]} onUpdate={(c) => c.lookAt(0, 0.3, 0.75)} />;
}

function Backdrop() {
  const tileMap = tileTexture();
  return (
    <group>
      <mesh position={[0, 1.5, -1.1]}>
        <planeGeometry args={[8, 4]} />
        <meshBasicMaterial map={tileMap} toneMapped={false} />
      </mesh>
      {/* Wooden shelf the options sit on */}
      <Box size={[3.6, 0.08, 0.8]} position={[0, -0.04, SHELF_Z]} color="#b9773f" />
      {/* Steel counter in front */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 1.8]}>
        <planeGeometry args={[8, 3.4]} />
        <meshToonMaterial color="#d6dade" gradientMap={toonGradient()} />
      </mesh>
      <Box size={[8, 0.3, 0.05]} position={[0, -0.25, 3.5]} color="#aab1b7" outline={false} />
    </group>
  );
}

function Shelf({ options, lang, onPick }: { options: Option[]; lang: Lang; onPick: (o: Option, from: THREE.Vector3) => void }) {
  const gap = Math.min(0.95, (VIEW_W - 0.1) / Math.max(options.length, 1));
  return (
    <>
      {options.map((o, i) => {
        const x = (i - (options.length - 1) / 2) * gap;
        return <Slot key={o.value} option={o} label={t(lang).labels[o.value]} x={x} delay={i * 70} width={gap * 0.92} onPick={onPick} />;
      })}
    </>
  );
}

// One pickable item on the shelf: pops in, bobs gently, label card underneath
function Slot({
  option,
  label,
  x,
  delay,
  width,
  onPick,
}: {
  option: Option;
  label: string;
  x: number;
  delay: number;
  width: number;
  onPick: (o: Option, from: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const card = cardTexture(label);

  useFrame(({ clock }) => {
    if (!group.current) return;
    born.current ??= performance.now();
    const t = Math.min(1, Math.max(0, (performance.now() - born.current - delay) / 260));
    const pop = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * 9) : 1;
    group.current.scale.setScalar(Math.max(0.001, pop));
    group.current.position.y = Math.sin(clock.elapsedTime * 2 + x * 3) * 0.02;
  });

  return (
    <group
      position={[x, 0, SHELF_Z]}
      onClick={(e) => {
        e.stopPropagation();
        onPick(option, new THREE.Vector3(x, 0, SHELF_Z));
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <group ref={group}>
        <ItemModel kind={option.kind} />
      </group>
      <mesh position={[0, 0.08, 0.55]} rotation={[-0.55, 0, 0]}>
        <planeGeometry args={[width, width / CARD_ASPECT]} />
        <meshBasicMaterial map={card} transparent toneMapped={false} />
      </mesh>
      {/* Tap target covers item and card */}
      <mesh position={[0, 0.3, 0.1]} visible={false}>
        <boxGeometry args={[width, 0.8, 0.7]} />
      </mesh>
    </group>
  );
}

function ItemModel({ kind }: { kind: Kind }) {
  switch (kind) {
    case "mug":
      return (
        <group>
          <Cyl top={0.24} bottom={0.21} height={0.42} position={[0, 0.21, 0]} color="#ffffff" />
          <mesh position={[0.27, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} />
            <ToonMaterial color="#ffffff" />
          </mesh>
          <Steam />
        </group>
      );
    case "glass":
      return (
        <group>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.21, 0.18, 0.6, 24, 1, true]} />
            <meshToonMaterial color="#cfeef7" transparent opacity={0.55} side={THREE.DoubleSide} gradientMap={toonGradient()} />
          </mesh>
          {[[-0.06, 0.12, 0], [0.06, 0.2, 0.03], [-0.02, 0.3, -0.04]].map((p, i) => (
            <Box key={i} size={[0.12, 0.12, 0.12]} position={p as [number, number, number]} rotation={[0.3, i, 0.2]} color="#e8f8ff" />
          ))}
        </group>
      );
    case "teh":
    case "kopi":
    case "milo":
    case "nescafe": {
      const c = { teh: ["#c8372b", "#f6d13a"], kopi: ["#6b3f22", "#e9c48a"], milo: ["#1f8a4c", "#f6d13a"], nescafe: ["#2a1a12", "#d8352a"] }[kind];
      return (
        <group>
          <Cyl top={0.2} bottom={0.2} height={0.5} position={[0, 0.25, 0]} color={c[0]} />
          <Cyl top={0.205} bottom={0.205} height={0.14} position={[0, 0.27, 0]} color={c[1]} outline={false} />
          <Cyl top={0.2} bottom={0.2} height={0.05} position={[0, 0.52, 0]} color="#b9bec4" />
        </group>
      );
    }
    case "pekat":
    case "cair": {
      const [body, band] = kind === "pekat" ? ["#f5f5f2", "#2a5bbf"] : ["#f2b33d", "#7a2a12"];
      return (
        <group>
          <Cyl top={0.17} bottom={0.17} height={0.34} position={[0, 0.17, 0]} color={body} />
          <Cyl top={0.175} bottom={0.175} height={0.12} position={[0, 0.18, 0]} color={band} outline={false} />
          <Cyl top={0.17} bottom={0.17} height={0.03} position={[0, 0.355, 0]} color="#b9bec4" />
          <Box size={[0.06, 0.03, 0.06]} position={[0.08, 0.38, 0]} color="#7d848b" />
        </group>
      );
    }
    case "none":
      // "O" = skip the milk: an empty can with a big red no-sign
      return (
        <group>
          <Cyl top={0.17} bottom={0.17} height={0.34} position={[0, 0.17, 0]} color="#e9e6df" />
          <mesh position={[0, 0.25, 0.2]}>
            <torusGeometry args={[0.2, 0.035, 10, 28]} />
            <ToonMaterial color="#d8352a" />
          </mesh>
          <Box size={[0.38, 0.06, 0.04]} position={[0, 0.25, 0.2]} rotation={[0, 0, -0.75]} color="#d8352a" outline={false} />
        </group>
      );
    case "sugar0":
    case "sugar1":
    case "sugar2": {
      const cubes = Number(kind.slice(-1));
      return (
        <group>
          <Cyl top={0.24} bottom={0.16} height={0.16} position={[0, 0.08, 0]} color="#ffffff" />
          {Array.from({ length: cubes }, (_, i) => (
            <Box key={i} size={[0.13, 0.13, 0.13]} position={[(i - (cubes - 1) / 2) * 0.15, 0.24, 0]} rotation={[0, 0.4 * i, 0]} color="#fbfbf7" />
          ))}
          {cubes === 0 && <Box size={[0.3, 0.035, 0.035]} position={[0, 0.22, 0]} rotation={[0, 0, -0.6]} color="#d8352a" outline={false} />}
        </group>
      );
    }
  }
}

function Steam() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.8 + i * 0.33) % 1;
      c.position.y = 0.5 + t * 0.35;
      c.scale.setScalar(0.6 + t * 0.6);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    });
  });
  return (
    <group ref={ref}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 0.08, 0.5, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// The picked item flies over the cup, tips, pours, then fades back to the shelf
function PourFx({ fx }: { fx: Fx }) {
  const group = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const stream = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const isVessel = fx.kind === "mug" || fx.kind === "glass";
  const color = STREAM[fx.kind];
  const above = useMemo(() => new THREE.Vector3(CUP_POS.x - 0.38, 0.95, CUP_POS.z), []);

  useFrame(() => {
    if (!group.current || !tilt.current || !stream.current) return;
    start.current ??= performance.now();
    const t = (performance.now() - start.current) / FLY_MS;
    if (t >= 1 || isVessel) {
      group.current.visible = false;
      return;
    }
    const ease = (x: number) => x * x * (3 - 2 * x);
    if (t < 0.35) group.current.position.lerpVectors(fx.from, above, ease(t / 0.35));
    else group.current.position.copy(above);
    const pourT = t < 0.35 ? 0 : Math.min(1, (t - 0.35) / 0.15);
    tilt.current.rotation.z = -pourT * 1.9;
    stream.current.visible = !!color && pourT > 0.8 && t < 0.9;
    group.current.scale.setScalar(t > 0.85 ? Math.max(0.001, (1 - t) / 0.15) : 1);
  });

  return (
    <group ref={group} position={fx.from.toArray()}>
      <group ref={tilt} position={[0, 0.25, 0]}>
        <group position={[0, -0.25, 0]}>
          <ItemModel kind={fx.kind} />
        </group>
      </group>
      <mesh ref={stream} position={[0.38, 0.1, 0]} visible={false}>
        <cylinderGeometry args={[0.035, 0.035, 0.75, 8]} />
        <ToonMaterial color={color ?? "#ffffff"} />
      </mesh>
    </group>
  );
}

function Vessel({ cup }: { cup: Cup }) {
  const liquid = useRef<THREE.Mesh>(null);
  const root = useRef<THREE.Group>(null);
  const isGlass = cup.temp === "ais";
  const r = isGlass ? 0.27 : 0.32;
  const h = isGlass ? 0.8 : 0.58;
  const fill = (cup.base ? 0.6 : 0) + (cup.milk && cup.milk !== "o" ? 0.25 : 0);
  const frothy = cup.temp === "panas" && cup.milk === "susu" && (cup.base === "teh" || cup.base === "nescafe");
  const done = !currentStep(cup);

  useFrame(({ clock }, dt) => {
    if (liquid.current) {
      const target = Math.max(0.001, fill);
      liquid.current.scale.y += (target - liquid.current.scale.y) * Math.min(1, dt * 4);
      liquid.current.position.y = 0.04 + (h * 0.9 * liquid.current.scale.y) / 2;
    }
    // Finished drinks do a little hop to say "ready"
    if (root.current) root.current.position.y = done ? Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.06 : 0;
  });

  if (!cup.temp)
    return (
      <group position={CUP_POS.toArray()}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
          <ringGeometry args={[0.3, 0.36, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      </group>
    );

  return (
    <group ref={root} position={CUP_POS.toArray()}>
      <mesh ref={liquid} scale={[1, 0.001, 1]}>
        <cylinderGeometry args={[r - 0.03, r - 0.03, h * 0.9, 24]} />
        <ToonMaterial color={cupColor(cup) === "transparent" ? "#ffffff" : cupColor(cup)} />
      </mesh>
      {frothy && fill > 0 && <Cyl top={r - 0.03} bottom={r - 0.03} height={0.05} position={[0, 0.04 + h * 0.9 * fill, 0]} color="#f3dfbf" outline={false} />}
      {isGlass ? (
        <>
          {[[-0.08, 0.55, 0.05], [0.07, 0.47, -0.06], [0.02, 0.65, 0.08]].map((p, i) => (
            <Box key={i} size={[0.12, 0.12, 0.12]} position={p as [number, number, number]} rotation={[0.3, i, 0.2]} color="#e8f8ff" />
          ))}
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[r, r * 0.88, h, 28, 1, true]} />
            <meshToonMaterial color="#d8f0f7" transparent opacity={0.4} side={THREE.DoubleSide} gradientMap={toonGradient()} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[r, r * 0.9, h, 28, 1, true]} />
            <meshToonMaterial color="#ffffff" side={THREE.DoubleSide} gradientMap={toonGradient()} />
          </mesh>
          {/* Outline hull for the open mug */}
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[r + 0.022, r * 0.9 + 0.022, h + 0.01, 28, 1, true]} />
            <meshBasicMaterial color="#151515" side={THREE.BackSide} />
          </mesh>
          <mesh position={[r + 0.07, h / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.13, 0.035, 8, 16, Math.PI]} />
            <ToonMaterial color="#ffffff" />
          </mesh>
          <Cyl top={r * 0.9} bottom={r * 0.9} height={0.03} position={[0, 0.015, 0]} color="#ffffff" />
        </>
      )}
      {/* Saucer */}
      <Cyl top={r + 0.12} bottom={r + 0.1} height={0.03} position={[0, -0.02, 0]} color="#f3efe6" />
    </group>
  );
}

function DoneSign({ text }: { text: string }) {
  const card = cardTexture(text, "#1f8a4c", "#ffffff", DONE_ASPECT);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.45 + Math.sin(clock.elapsedTime * 3) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0.45, SHELF_Z]} rotation={[-0.2, 0, 0]}>
      <planeGeometry args={[2.6, 2.6 / DONE_ASPECT]} />
      <meshBasicMaterial map={card} transparent toneMapped={false} />
    </mesh>
  );
}

// Cached per label: the shelf remounts every step, and uncached canvas textures piled up on the GPU
const cards = new Map<string, THREE.CanvasTexture>();

// Canvas is drawn at the same aspect as the plane it's mapped onto, so text never stretches
const CARD_ASPECT = 3.2;
const DONE_ASPECT = 5.2;

function cardTexture(text: string, bg = "#fbf3e4", fg = "#1f1a17", aspect = CARD_ASPECT) {
  const key = `${text}|${bg}|${fg}|${aspect}`;
  const hit = cards.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.height = 160;
  c.width = Math.round(c.height * aspect);
  const w = c.width;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f1a17";
  g.beginPath();
  g.roundRect(6, 12, w - 12, 142, 36);
  g.fill();
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(6, 4, w - 12, 140, 36);
  g.fill();
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = 92;
  do {
    g.font = `900 ${size}px system-ui, sans-serif`;
    size -= 4;
  } while (g.measureText(text).width > w - 60 && size > 30);
  g.fillText(text, w / 2, 78);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cards.set(key, tex);
  return tex;
}

let tiles: THREE.CanvasTexture | null = null;

function tileTexture() {
  if (tiles) return tiles;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f8f86";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#5fb3a9";
  g.lineWidth = 4;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tiles = tex;
  return tex;
}
