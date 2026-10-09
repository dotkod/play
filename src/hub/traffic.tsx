"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import * as THREE from "three";
import { ambience, sfx } from "@/shared/audio";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { dynamicColliders } from "./colliders";
import { type Axis, signalFor } from "@/world/road-graph";
import { PHONE_DRAW_MS, player } from "@/world/player-bridge";
import { pickNextLane, pointOnLane, VEHICLE_LANES, type VehicleLane } from "@/world/vehicle-routes";
import { BUILDINGS, ROAD_HALF, WALK_HALF, buildingBlocksCrossRoad, footprint } from "./world-data";

export type { Axis };
export { signalFor, player, PHONE_DRAW_MS };

// Guard: a shophouse overlapping the cross-road corridor will swallow Z-lane cars
if (process.env.NODE_ENV !== "production") {
  for (const b of BUILDINGS) {
    if (buildingBlocksCrossRoad(b)) {
      console.error(`[traffic] ${b.id} overlaps cross-road corridor — move it clear of ±ROAD_CLEAR`);
    }
  }
}

/** Inflated building AABBs — vehicles must not sit inside these. */
const BUILDING_HIT = BUILDINGS.map((b) => {
  const f = footprint(b);
  const pad = 0.35;
  return { minX: f.minX - pad, maxX: f.maxX + pad, minZ: f.minZ - pad, maxZ: f.maxZ + pad };
});
const inBuilding = (x: number, z: number) => BUILDING_HIT.some((s) => x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ);

// ---------- Traffic lights ----------

type Signal = "green" | "yellow" | "red";

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

// ---------- Vehicles (city-wide lanes from ROAD_STRIPS) ----------

type Kind = "hatch" | "sedan" | "suv" | "mpv" | "taxi" | "lorry" | "bus" | "bike";
type Vehicle = {
  id: number;
  kind: Kind;
  laneId: string;
  s: number;
  speed: number;
  max: number;
  color: string;
  rider: number;
  honkedAt: number;
};

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

const STOP_AT = WALK_HALF + 0.6;
const FOLLOW_GAP = 3.2;
/** World-space bumper radius — stops cars stacking across lanes at junctions. */
const WORLD_SEP = 4.2;
const CAR_COLORS = ["#d8352a", "#2f6fd6", "#f2f2ee", "#1f1f24", "#f2b33d", "#9aa3ab", "#2f8f86", "#7a4a2e", "#c7b2e6"];

const LANE_BY_ID = Object.fromEntries(VEHICLE_LANES.map((l) => [l.id, l])) as Record<string, VehicleLane>;

function weightedKind(allowBus: boolean): Kind {
  const kinds = (Object.keys(SPECS) as Kind[]).filter((k) => allowBus || k !== "bus");
  let r = Math.random() * kinds.reduce((a, k) => a + SPECS[k].weight, 0);
  for (const k of kinds) if ((r -= SPECS[k].weight) <= 0) return k;
  return "sedan";
}

function needGap(a: Vehicle, b: Vehicle) {
  return (lengthOf(a) + lengthOf(b)) / 2 + FOLLOW_GAP;
}

function spawnVehicles(): Vehicle[] {
  const list: Vehicle[] = [];
  let id = 0;
  for (const lane of VEHICLE_LANES) {
    let busUsed = false;
    let cursor = 4 + Math.random() * 3;
    for (let i = 0; i < lane.capacity; i++) {
      const kind = weightedKind(!busUsed && lane.length > 40);
      if (kind === "bus") busUsed = true;
      const len = SPECS[kind].len;
      cursor += len / 2;
      if (cursor + len / 2 > lane.length - 3) break;
      const [lo, hi] = SPECS[kind].speed;
      const max = lo + Math.random() * (hi - lo);
      list.push({
        id: id++,
        kind,
        laneId: lane.id,
        s: cursor,
        speed: max * 0.55,
        max,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        rider: Math.floor(Math.random() * RIDERS.length),
        honkedAt: -99,
      });
      cursor += len / 2 + FOLLOW_GAP + 2;
    }
  }
  return list;
}

/** Nose distance to Pusat stop line when heading into the junction on a main strip. */
function distToStopLine(lane: VehicleLane, x: number, z: number, bodyLen: number): number | null {
  const headingToCentre =
    lane.axis === "x"
      ? Math.sign(lane.b.x - lane.a.x) === Math.sign(0 - x) && Math.abs(x) > 0.5
      : Math.sign(lane.b.z - lane.a.z) === Math.sign(0 - z) && Math.abs(z) > 0.5;
  if (!headingToCentre) return null;
  if (lane.axis === "x") {
    if (Math.abs(z) > 3.2) return null;
    const nose = Math.abs(x) - bodyLen / 2;
    return nose - STOP_AT;
  }
  if (Math.abs(x) > 3.2) return null;
  const nose = Math.abs(z) - bodyLen / 2;
  return nose - STOP_AT;
}

// Simulation state lives outside React
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
      const lane = LANE_BY_ID[v.laneId];
      if (!lane) continue;
      const length = lengthOf(v);
      let target = v.max;
      const here = pointOnLane(lane, v.s);

      // Pusat lights on the main cross (strips through origin)
      const toLine = distToStopLine(lane, here.x, here.z, length);
      if (toLine != null && toLine > -0.2 && toLine < 14) {
        const signal = signalFor(lane.axis, t);
        if (signal !== "green" && !(signal === "yellow" && toLine < 2.5)) {
          target = Math.min(target, Math.max(0, toLine - 0.3) * 1.6);
        }
      }

      // Gap to leader on the same lane
      for (const o of all) {
        if (o === v || o.laneId !== v.laneId) continue;
        const gap = o.s - v.s;
        if (gap <= 0) continue;
        const need = needGap(v, o);
        if (gap < need + 8) target = Math.min(target, Math.max(0, gap - need) * 2.2);
      }

      // World-space slowdown for nearby vehicles (junctions / parallel strips)
      for (const o of all) {
        if (o === v) continue;
        const otherLane = LANE_BY_ID[o.laneId];
        if (!otherLane) continue;
        const there = pointOnLane(otherLane, o.s);
        const dx = there.x - here.x;
        const dz = there.z - here.z;
        const dist = Math.hypot(dx, dz);
        if (dist > WORLD_SEP + 6) continue;
        const fx = Math.sin(here.rotY);
        const fz = Math.cos(here.rotY);
        const ahead = dx * fx + dz * fz;
        if (ahead < 0.4) continue;
        const need = (lengthOf(v) + lengthOf(o)) / 2 + 1.6;
        if (dist < need + 5) target = Math.min(target, Math.max(0, dist - need) * 2.4);
      }

      // Brake for player ahead in this lane
      {
        const pAlong =
          lane.axis === "x"
            ? (player.x - lane.a.x) * Math.sign(lane.b.x - lane.a.x)
            : (player.z - lane.a.z) * Math.sign(lane.b.z - lane.a.z);
        const pLat = lane.axis === "x" ? player.z - here.z : player.x - here.x;
        const ahead = pAlong - v.s;
        if (Math.abs(pLat) < 1.7 && ahead > 0 && ahead < length / 2 + 5) {
          target = Math.min(target, Math.max(0, ahead - length / 2 - 1.2) * 2);
          if (ahead < length / 2 + 3 && t - v.honkedAt > 4) {
            v.honkedAt = t;
            sfx.horn();
          }
        }
      }

      // Pedestrians in the carriageway
      for (const person of dynamicColliders.people) {
        if (!person) continue;
        const pAlong =
          lane.axis === "x"
            ? (person.x - lane.a.x) * Math.sign(lane.b.x - lane.a.x)
            : (person.z - lane.a.z) * Math.sign(lane.b.z - lane.a.z);
        const pLat = lane.axis === "x" ? person.z - here.z : person.x - here.x;
        if (Math.abs(pLat) > 1.8 + person.r) continue;
        const ahead = pAlong - v.s;
        if (ahead > 0 && ahead < length / 2 + 4) {
          target = Math.min(target, Math.max(0, ahead - length / 2 - 0.8) * 2.5);
        }
      }

      const heavy = v.kind === "lorry" || v.kind === "bus";
      const rate = target < v.speed ? 16 : heavy ? 2.5 : 4;
      v.speed += Math.sign(target - v.speed) * Math.min(Math.abs(target - v.speed), rate * dt);
      let nextS = v.s + v.speed * dt;
      const probe = pointOnLane(lane, Math.min(nextS, lane.length));
      if (inBuilding(probe.x, probe.z)) {
        v.speed = 0;
        nextS = v.s;
      }

      // End of strip → turn onto a linked lane (junction hop) or U-turn
      if (nextS >= lane.length - 1) {
        const hop = pickNextLane(lane);
        v.laneId = hop.laneId;
        v.s = hop.entryS + Math.random() * 1.5;
        v.speed *= 0.45;
      } else {
        v.s = nextS;
      }
    }

    // Hard bumper separation on each lane
    for (const v of all) {
      let leader: Vehicle | null = null;
      let leaderGap = Infinity;
      for (const o of all) {
        if (o === v || o.laneId !== v.laneId) continue;
        const gap = o.s - v.s;
        if (gap <= 0) continue;
        if (gap < leaderGap) {
          leaderGap = gap;
          leader = o;
        }
      }
      if (leader) {
        const need = needGap(v, leader);
        if (leaderGap < need) {
          v.s = leader.s - need;
          v.speed = Math.min(v.speed, Math.min(leader.speed, 1));
        }
      }
    }

    // World-space push so cars don't occupy the same spot across lanes
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < all.length; i++) {
        const a = all[i];
        const la = LANE_BY_ID[a.laneId];
        if (!la) continue;
        const pa = pointOnLane(la, a.s);
        for (let j = i + 1; j < all.length; j++) {
          const b = all[j];
          const lb = LANE_BY_ID[b.laneId];
          if (!lb) continue;
          const pb = pointOnLane(lb, b.s);
          const dx = pb.x - pa.x;
          const dz = pb.z - pa.z;
          const dist = Math.hypot(dx, dz);
          const need = (lengthOf(a) + lengthOf(b)) * 0.35 + 1.4;
          if (dist >= need || dist < 1e-4) continue;
          // Push the slower / trailing vehicle back along its lane
          const push = (need - dist) * 0.55;
          if (a.speed <= b.speed) {
            a.s = Math.max(0.5, a.s - push);
            a.speed = Math.min(a.speed, 1.2);
          } else {
            b.s = Math.max(0.5, b.s - push);
            b.speed = Math.min(b.speed, 1.2);
          }
        }
      }
    }

    for (const v of all) {
      const lane = LANE_BY_ID[v.laneId];
      if (!lane) continue;
      const { x: vx, z: vz, rotY } = pointOnLane(lane, v.s);
      const spec = SPECS[v.kind];
      const n = Math.max(2, Math.ceil(spec.len / 2));
      const r = spec.width / 2 + 0.1;
      const fx = Math.sin(rotY);
      const fz = Math.cos(rotY);
      for (let i = 0; i < n; i++) {
        const o = -spec.len / 2 + r + (i / (n - 1)) * (spec.len - 2 * r);
        circles.push({ x: vx + fx * o, z: vz + fz * o, r });
      }
      const d = Math.hypot(vx - player.x, vz - player.z) - v.speed * 0.1;
      if (d < nearest) {
        nearest = d;
        nearestBike = v.kind === "bike";
      }
      const g = refs.current[v.id];
      if (!g) continue;
      g.position.set(vx, 0, vz);
      g.rotation.y = rotY;
    }
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
