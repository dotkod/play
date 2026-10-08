"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import * as THREE from "three";
import { ambience, sfx } from "@/shared/audio";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { dynamicColliders } from "./colliders";
import { EXTENT, ROAD_HALF, WALK_HALF } from "./world-data";

// ---------- Traffic lights ----------

export type Axis = "x" | "z";
type Signal = "green" | "yellow" | "red";

const CYCLE = 18;
// x-axis (main road) green 0-7, yellow 7-9, then z-axis green 9-16, yellow 16-18
export function signalFor(axis: Axis, t: number): Signal {
  const p = t % CYCLE;
  const own = axis === "x" ? p : (p + CYCLE / 2) % CYCLE;
  return own < 7 ? "green" : own < 9 ? "yellow" : "red";
}

// Where the player is, so vehicles can stop for them
export const player = { x: 0, z: 0, rot: 0, crouchUntil: 0 };

// Each pole faces traffic arriving from one side
const POLES: { axis: Axis; x: number; z: number; rotY: number }[] = [
  { axis: "x", x: -WALK_HALF - 0.2, z: -WALK_HALF + 0.6, rotY: -Math.PI / 2 },
  { axis: "x", x: WALK_HALF + 0.2, z: WALK_HALF - 0.6, rotY: Math.PI / 2 },
  { axis: "z", x: WALK_HALF - 0.6, z: -WALK_HALF - 0.2, rotY: Math.PI },
  { axis: "z", x: -WALK_HALF + 0.6, z: WALK_HALF + 0.2, rotY: 0 },
];

const LAMP_ON = { red: "#ff3b30", yellow: "#ffcc00", green: "#34e07a" };
const LAMP_OFF = "#3a3a3a";

export const TrafficLights = memo(function TrafficLights() {
  return (
    <>
      {POLES.map((p, i) => (
        <TrafficPole key={i} {...p} />
      ))}
    </>
  );
});

function TrafficPole({ axis, x, z, rotY }: { axis: Axis; x: number; z: number; rotY: number }) {
  const lamps = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const order: Signal[] = ["red", "yellow", "green"];
  useFrame(({ clock }) => {
    const s = signalFor(axis, clock.elapsedTime);
    order.forEach((name, i) => lamps.current[i]?.color.set(s === name ? LAMP_ON[name] : LAMP_OFF));
  });
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <Cyl top={0.08} bottom={0.1} height={3.4} position={[0, 1.7, 0]} color="#5b6066" />
      <Box size={[0.42, 1.15, 0.36]} position={[0, 3.3, 0]} color="#1f1f24" />
      {order.map((name, i) => (
        <mesh key={name} position={[0, 3.66 - i * 0.36, 0.19]}>
          <circleGeometry args={[0.13, 16]} />
          <meshBasicMaterial ref={(m) => void (lamps.current[i] = m)} color={LAMP_OFF} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Vehicles ----------

type Kind = "hatch" | "sedan" | "suv" | "mpv" | "taxi" | "lorry" | "bus" | "bike";
type Vehicle = { id: number; kind: Kind; axis: Axis; dir: 1 | -1; pos: number; speed: number; max: number; color: string; rider: number; honkedAt: number };

// Size and behaviour per vehicle type; length drives spacing, stop lines and collision shape
const SPECS: Record<Kind, { len: number; width: number; speed: [number, number]; weight: number }> = {
  hatch: { len: 3.5, width: 1.7, speed: [7, 9], weight: 3 },
  sedan: { len: 4.3, width: 1.8, speed: [7, 9], weight: 3 },
  suv: { len: 4.5, width: 1.9, speed: [7, 8.5], weight: 2 },
  mpv: { len: 4.7, width: 1.9, speed: [6.5, 8], weight: 2 },
  taxi: { len: 4.3, width: 1.8, speed: [6.5, 8], weight: 1 },
  lorry: { len: 6.8, width: 2.3, speed: [5, 6], weight: 1 },
  bus: { len: 9, width: 2.5, speed: [5, 6], weight: 0.7 },
  bike: { len: 2, width: 0.6, speed: [9, 12], weight: 4 },
};
const lengthOf = (v: Vehicle) => SPECS[v.kind].len;

const LANE = 1.5;
const STOP_AT = WALK_HALF + 0.6; // stop line, measured from the junction centre
const CAR_COLORS = ["#d8352a", "#2f6fd6", "#f2f2ee", "#1f1f24", "#f2b33d", "#9aa3ab", "#2f8f86", "#7a4a2e", "#c7b2e6"];

// Drive on the left: facing +x the left side is -z; facing +z the left side is +x
export function laneOffset(axis: Axis, dir: 1 | -1) {
  return axis === "x" ? -dir * LANE : dir * LANE;
}

function weightedKind(allowBus: boolean): Kind {
  const kinds = (Object.keys(SPECS) as Kind[]).filter((k) => allowBus || k !== "bus");
  let r = Math.random() * kinds.reduce((a, k) => a + SPECS[k].weight, 0);
  for (const k of kinds) if ((r -= SPECS[k].weight) <= 0) return k;
  return "sedan";
}

function spawnVehicles(): Vehicle[] {
  const list: Vehicle[] = [];
  let id = 0;
  const lanes: [Axis, 1 | -1][] = [
    ["x", 1],
    ["x", -1],
    ["z", 1],
    ["z", -1],
  ];
  for (const [axis, dir] of lanes) {
    const count = axis === "x" ? 5 : 4;
    let busUsed = false;
    for (let i = 0; i < count; i++) {
      // At most one bus per lane so queues stay readable
      const kind = weightedKind(!busUsed);
      if (kind === "bus") busUsed = true;
      const [lo, hi] = SPECS[kind].speed;
      const max = lo + Math.random() * (hi - lo);
      list.push({
        id: id++,
        kind,
        axis,
        dir,
        pos: -EXTENT + (i / count) * EXTENT * 2 + Math.random() * 4,
        speed: max,
        max,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        rider: Math.floor(Math.random() * RIDERS.length),
        honkedAt: -99,
      });
    }
  }
  return list;
}

// Signed distance travelled "along" the lane, so ahead is always larger
const along = (v: Vehicle) => v.pos * v.dir;

// Simulation state lives outside React: it is mutated every frame and never drives a re-render
let fleet: Vehicle[] | null = null;
let engineTick = 0;
const getFleet = () => (fleet ??= spawnVehicles());

export const Traffic = memo(function Traffic() {
  const vehicles = getFleet();
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const all = getFleet();
    let nearest = Infinity;
    let nearestBike = false;
    const circles = dynamicColliders.vehicles;
    circles.length = 0;
    for (const v of all) {
      const me = along(v);
      const length = lengthOf(v);
      let target = v.max;

      // Red or late yellow: stop at the line if we haven't reached it yet
      const signal = signalFor(v.axis, t);
      const toLine = -STOP_AT - length / 2 - me; // distance from our nose to the stop line
      if (signal !== "green" && toLine > -0.2 && toLine < 14) {
        if (!(signal === "yellow" && toLine < 2.5)) target = Math.min(target, Math.max(0, toLine - 0.3) * 1.6);
      }

      // Keep a gap to whoever is ahead in the same lane
      for (const o of all) {
        if (o === v || o.axis !== v.axis || o.dir !== v.dir) continue;
        let gap = along(o) - me;
        if (gap < 0) gap += EXTENT * 2;
        const need = (length + lengthOf(o)) / 2 + 1.6;
        if (gap < need + 6) target = Math.min(target, Math.max(0, gap - need) * 1.8);
      }

      // Brake for the player standing in our lane
      const lane = laneOffset(v.axis, v.dir);
      const px = v.axis === "x" ? player.x : player.z;
      const pl = v.axis === "x" ? player.z : player.x;
      const ahead = px * v.dir - me;
      if (Math.abs(pl - lane) < 1.6 && ahead > 0 && ahead < length / 2 + 5) {
        target = Math.min(target, Math.max(0, ahead - length / 2 - 1.2) * 2);
        // Impatient honk when you're standing in the road, at most every few seconds per vehicle
        if (ahead < length / 2 + 3 && t - v.honkedAt > 4) {
          v.honkedAt = t;
          sfx.horn();
        }
      }

      // Ease towards the target speed: brake harder than we accelerate (heavy vehicles accelerate slower)
      const heavy = v.kind === "lorry" || v.kind === "bus";
      const rate = target < v.speed ? 14 : heavy ? 2.5 : 4;
      v.speed += Math.sign(target - v.speed) * Math.min(Math.abs(target - v.speed), rate * dt);
      v.pos += v.dir * v.speed * dt;
      if (v.pos * v.dir > EXTENT) v.pos -= v.dir * EXTENT * 2;

      const vx = v.axis === "x" ? v.pos : lane;
      const vz = v.axis === "x" ? lane : v.pos;
      // Body as a chain of circles along the direction of travel
      const spec = SPECS[v.kind];
      const n = Math.max(2, Math.ceil(spec.len / 2));
      const r = spec.width / 2 + 0.1;
      for (let i = 0; i < n; i++) {
        const o = -spec.len / 2 + r + (i / (n - 1)) * (spec.len - 2 * r);
        circles.push(v.axis === "x" ? { x: vx + o, z: vz, r } : { x: vx, z: vz + o, r });
      }
      // Track the closest moving vehicle for the engine sound
      const d = Math.hypot(vx - player.x, vz - player.z) - v.speed * 0.1;
      if (d < nearest) {
        nearest = d;
        nearestBike = v.kind === "bike";
      }

      const g = refs.current[v.id];
      if (!g) continue;
      if (v.axis === "x") g.position.set(v.pos, 0, lane);
      else g.position.set(lane, 0, v.pos);
      g.rotation.y = v.axis === "x" ? (v.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : v.dir > 0 ? 0 : Math.PI;
    }
    // ~10 Hz is plenty for the engine sound and keeps the audio automation timeline short
    if ((engineTick = (engineTick + 1) % 6) === 0) ambience.setEngine(Math.max(0, 1 - nearest / 14), nearestBike);
  });

  return (
    <>
      {vehicles.map((v) => (
        <group key={v.id} ref={(g) => void (refs.current[v.id] = g)}>
          <VehicleModel kind={v.kind} color={v.color} rider={RIDERS[v.rider]} />
        </group>
      ))}
    </>
  );
});

function Wheel({ position, r = 0.32 }: { position: [number, number, number]; r?: number }) {
  return <Cyl top={r} bottom={r} height={0.26} segments={14} position={position} rotation={[0, 0, Math.PI / 2]} color="#1a1a1a" />;
}

function VehicleModel({ kind, color, rider }: { kind: Kind; color: string; rider: Rider }) {
  switch (kind) {
    case "bike":
      return <DeliveryBike rider={rider} bike={color} />;
    case "lorry":
      return <Lorry color={color} />;
    case "bus":
      return <Bus />;
    default:
      return <Car kind={kind} color={kind === "taxi" ? "#d8352a" : color} />;
  }
}

// Passenger cars share a template: body + glasshouse, proportions per type
const CAR_SHAPES: Record<"hatch" | "sedan" | "suv" | "mpv" | "taxi", { body: [number, number, number]; cabin: [number, number, number]; cabinZ: number; lift: number; wheel: number }> = {
  hatch: { body: [1.7, 0.75, 3.5], cabin: [1.55, 0.7, 2.1], cabinZ: -0.35, lift: 0, wheel: 0.3 },
  sedan: { body: [1.8, 0.65, 4.3], cabin: [1.55, 0.58, 2.0], cabinZ: -0.15, lift: 0, wheel: 0.32 },
  suv: { body: [1.9, 0.9, 4.5], cabin: [1.75, 0.72, 2.6], cabinZ: -0.4, lift: 0.15, wheel: 0.4 },
  mpv: { body: [1.9, 0.8, 4.7], cabin: [1.75, 0.85, 3.5], cabinZ: -0.35, lift: 0.05, wheel: 0.34 },
  taxi: { body: [1.8, 0.65, 4.3], cabin: [1.55, 0.58, 2.0], cabinZ: -0.15, lift: 0, wheel: 0.32 },
};

function Car({ kind, color }: { kind: keyof typeof CAR_SHAPES; color: string }) {
  const c = CAR_SHAPES[kind];
  const [w, h, l] = c.body;
  const base = c.wheel + 0.05 + c.lift;
  return (
    <group>
      <RBox size={c.body} radius={0.14} position={[0, base + h / 2, 0]} color={color} />
      <RBox size={c.cabin} radius={0.14} position={[0, base + h + c.cabin[1] / 2 - 0.05, c.cabinZ]} color={kind === "taxi" ? "#f4f6f8" : "#bfe6ef"} />
      {kind === "taxi" && <Box size={[0.7, 0.22, 0.35]} position={[0, base + h + c.cabin[1] + 0.06, c.cabinZ]} color="#f6d13a" />}
      {kind === "suv" && (
        <>
          <Box size={[0.06, 0.06, c.cabin[2] * 0.9]} position={[-c.cabin[0] / 2 + 0.1, base + h + c.cabin[1], c.cabinZ]} color="#2a2a2a" outline={false} />
          <Box size={[0.06, 0.06, c.cabin[2] * 0.9]} position={[c.cabin[0] / 2 - 0.1, base + h + c.cabin[1], c.cabinZ]} color="#2a2a2a" outline={false} />
        </>
      )}
      <Box size={[w - 0.2, 0.12, 0.05]} position={[0, base + h * 0.6, l / 2 + 0.01]} color="#fff6c8" outline={false} />
      <Box size={[w - 0.2, 0.12, 0.05]} position={[0, base + h * 0.6, -l / 2 - 0.01]} color="#c62f25" outline={false} />
      {[1, -1].map((zs) =>
        [1, -1].map((xs) => <Wheel key={`${zs}${xs}`} r={c.wheel} position={[(xs * w) / 2, c.wheel, zs * (l / 2 - 0.75)]} />),
      )}
    </group>
  );
}

// Lorry: cab up front, tall cargo box behind, six wheels
function Lorry({ color }: { color: string }) {
  return (
    <group>
      <RBox size={[2.2, 1.7, 1.8]} radius={0.15} position={[0, 1.35, 2.4]} color={color} />
      <Box size={[1.9, 0.6, 0.05]} position={[0, 1.75, 3.31]} color="#bfe6ef" outline={false} />
      <Box size={[2.3, 2.5, 4.6]} position={[0, 2.0, -0.85]} color="#f4f6f8" />
      <Box size={[2.32, 0.35, 4.62]} position={[0, 1.4, -0.85]} color="#2f6fd6" outline={false} />
      <Box size={[2.2, 0.25, 6.6]} position={[0, 0.62, 0.1]} color="#2a2a2a" outline={false} />
      {[2.5, -0.4, -2.3].map((z) => [1, -1].map((xs) => <Wheel key={`${z}${xs}`} r={0.45} position={[xs * 1.05, 0.45, z]} />))}
    </group>
  );
}

// City bus in red and white, windows all along
function Bus() {
  return (
    <group>
      <RBox size={[2.5, 2.6, 9]} radius={0.25} position={[0, 1.75, 0]} color="#f4f6f8" />
      <Box size={[2.52, 0.9, 8.4]} position={[0, 2.3, -0.1]} color="#2f4659" outline={false} />
      <Box size={[2.52, 0.45, 9.02]} position={[0, 0.85, 0]} color="#d8352a" outline={false} />
      <Box size={[1.6, 0.35, 0.05]} position={[0, 2.85, 4.51]} color="#f6d13a" outline={false} />
      {[3, -3].map((z) => [1, -1].map((xs) => <Wheel key={`${z}${xs}`} r={0.5} position={[xs * 1.2, 0.5, z]} />))}
    </group>
  );
}

// Food delivery riders in the colours Malaysians recognise from the road (no logos, just the vibe)
type Rider = { jacket: string; helmet: string; box: string; trim: string };
const RIDERS: Rider[] = [
  { jacket: "#00b14f", helmet: "#00b14f", box: "#00b14f", trim: "#ffffff" }, // green
  { jacket: "#ee4d2d", helmet: "#ee4d2d", box: "#ee4d2d", trim: "#ffffff" }, // orange
  { jacket: "#d70f64", helmet: "#d70f64", box: "#d70f64", trim: "#ffffff" }, // pink
  { jacket: "#f16622", helmet: "#ffffff", box: "#f16622", trim: "#ffffff" }, // orange + white helmet
];

const riderPose: Pose = { x: 0, z: -0.15, rotY: 0, walking: false, seated: true };
const getRiderPose = () => riderPose;

function DeliveryBike({ rider, bike }: { rider: Rider; bike: string }) {
  const look: Look = { skin: "#a96d47", shirt: rider.jacket, pants: "#1f1f24", headwear: "cap", hair: rider.helmet };
  return (
    <group>
      <RBox size={[0.45, 0.45, 1.5]} radius={0.1} position={[0, 0.65, 0]} color="#2a2a2a" />
      <RBox size={[0.5, 0.25, 0.6]} radius={0.08} position={[0, 0.95, 0.45]} color={bike} />
      <Wheel position={[0, 0.32, 0.65]} />
      <Wheel position={[0, 0.32, -0.65]} />
      <Box size={[0.6, 0.06, 0.06]} position={[0, 1.25, 0.55]} color="#3a3a3a" />
      <group position={[0, 0.25, 0]} scale={0.9}>
        <Person look={look} getPose={getRiderPose} />
      </group>
      {/* Thermal delivery box with a white stripe */}
      <RBox size={[0.6, 0.55, 0.55]} radius={0.06} position={[0, 1.55, -0.75]} color={rider.box} />
      <Box size={[0.62, 0.08, 0.57]} position={[0, 1.6, -0.75]} color={rider.trim} outline={false} />
    </group>
  );
}

// Zebra crossings and the stop lines sit just outside the junction box
export const ROAD_MARK = { stopAt: STOP_AT, roadHalf: ROAD_HALF };
