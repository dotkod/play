"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import * as THREE from "three";
import { Box, RBox } from "@/shared/three/toon";
import { PARKING_LOTS, parkingApron, parkingEntrance, type ParkingLot, type ParkingStall } from "./parking-lots";

function ParkedCar({ stall }: { stall: ParkingStall }) {
  return (
    <group position={[stall.dx, 0, stall.dz]} rotation={[0, stall.rotY, 0]}>
      <RBox size={[1.7, 0.7, 3.4]} radius={0.12} position={[0, 0.55, 0]} color={stall.color} />
      <RBox size={[1.55, 0.55, 2.0]} radius={0.1} position={[0, 1.05, -0.2]} color="#bfe6ef" />
      <Box size={[1.5, 0.1, 0.04]} position={[0, 0.7, 1.72]} color="#fff6c8" outline={false} />
      <Box size={[1.5, 0.1, 0.04]} position={[0, 0.7, -1.72]} color="#c62f25" outline={false} />
    </group>
  );
}

/** P-sign sits on the lot edge facing the public road. */
function entranceOffset(lot: ParkingLot): [number, number] {
  const road = parkingEntrance(lot);
  const dx = road.x - lot.x;
  const dz = road.z - lot.z;
  if (Math.abs(dx) >= Math.abs(dz)) {
    return [Math.sign(dx || 1) * (lot.w / 2 + 0.7), 0];
  }
  return [0, Math.sign(dz || 1) * (lot.d / 2 + 0.7)];
}

function LotMesh({ lot }: { lot: ParkingLot }) {
  const lines: { x: number; z: number; w: number; d: number }[] = [];
  const cols = Math.max(2, Math.round(lot.w / 3.6));
  const rows = Math.max(2, Math.round(lot.d / 4.5));
  for (let c = 0; c <= cols; c++) {
    const x = -lot.w / 2 + (c / cols) * lot.w;
    lines.push({ x, z: 0, w: 0.08, d: lot.d - 0.6 });
  }
  for (let r = 0; r <= rows; r++) {
    const z = -lot.d / 2 + (r / rows) * lot.d;
    lines.push({ x: 0, z, w: lot.w - 0.6, d: 0.08 });
  }
  const [ex, ez] = entranceOffset(lot);
  // Short apron only — do NOT paint over the public ROAD_STRIPS (that z-fought the spur)
  const apronLen = 2.8;

  return (
    <group position={[lot.x, 0, lot.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow>
        <planeGeometry args={[lot.w, lot.d]} />
        <meshLambertMaterial color="#4a5058" />
      </mesh>
      {/* Curb cut at lot edge facing the road */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[ex * 0.55, 0.027, ez * 0.55]}
        receiveShadow
      >
        <planeGeometry
          args={Math.abs(ex) >= Math.abs(ez) ? [apronLen, Math.min(lot.d * 0.55, 4)] : [Math.min(lot.w * 0.55, 4), apronLen]}
        />
        <meshLambertMaterial color="#5a6068" />
      </mesh>
      {lines.map((l, i) => (
        <Box key={i} size={[l.w, 0.02, l.d]} position={[l.x, 0.04, l.z]} color="#f4f1ea" outline={false} />
      ))}
      {/* P sign at entrance */}
      <group position={[ex * 0.85, 0, ez * 0.85]}>
        <Box size={[0.1, 2.2, 0.1]} position={[0, 1.1, 0]} color="#4b5563" outline={false} />
        <Box size={[0.7, 0.7, 0.08]} position={[0, 2.3, 0]} color="#1f5fa8" outline={false} />
        <Box size={[0.28, 0.4, 0.04]} position={[0, 2.3, 0.06]} color="#f4f1ea" outline={false} />
      </group>
      {lot.stalls.map((s, i) => (
        <ParkedCar key={i} stall={s} />
      ))}
    </group>
  );
}

type Cruise = {
  lotId: string;
  stallIdx: number;
  /** 0 = apron→stall, 1 = parked, 2 = stall→apron (stay inside the lot — never on public road) */
  phase: 0 | 1 | 2;
  t: number;
  color: string;
};

const COLORS = ["#d8352a", "#2f6fd6", "#f2b33d", "#1f1f24", "#2f8f86"];

// Simulation outside React (same pattern as traffic fleet)
const cruiseFleet: Cruise[] = PARKING_LOTS.map((lot, i) => ({
  lotId: lot.id,
  stallIdx: i % Math.max(1, lot.stalls.length),
  phase: 0 as const,
  t: i * 4.5,
  color: COLORS[i % COLORS.length],
}));

function stallWorld(lot: ParkingLot, stall: ParkingStall) {
  return { x: lot.x + stall.dx, z: lot.z + stall.dz, rotY: stall.rotY };
}

function lerpCar(
  g: THREE.Group,
  from: { x: number; z: number },
  to: { x: number; z: number },
  u: number,
) {
  const e = u * u * (3 - 2 * u);
  g.position.set(from.x + (to.x - from.x) * e, 0, from.z + (to.z - from.z) * e);
  g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
}

/** One car per lot shuffles bay ↔ apron inside the lot only (no spur / zebra drive-through). */
function ParkingTraffic() {
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, dt) => {
    for (let i = 0; i < cruiseFleet.length; i++) {
      const c = cruiseFleet[i];
      const lot = PARKING_LOTS[i];
      const g = refs.current[i];
      if (!lot || !g || !lot.stalls.length) continue;
      c.t += dt;
      const stall = lot.stalls[c.stallIdx % lot.stalls.length];
      const apron = parkingApron(lot);
      const bay = stallWorld(lot, stall);

      if (c.phase === 0) {
        const u = Math.min(1, c.t / 3.5);
        lerpCar(g, apron, bay, u);
        if (u >= 1) {
          c.phase = 1;
          c.t = 0;
          g.position.set(bay.x, 0, bay.z);
          g.rotation.y = bay.rotY;
        }
      } else if (c.phase === 1) {
        g.position.set(bay.x, 0, bay.z);
        g.rotation.y = bay.rotY;
        if (c.t > 14 + (i % 3) * 4) {
          c.phase = 2;
          c.t = 0;
        }
      } else {
        const u = Math.min(1, c.t / 3.2);
        lerpCar(g, bay, apron, u);
        if (u >= 1) {
          c.stallIdx = (c.stallIdx + 2) % lot.stalls.length;
          c.color = COLORS[(i + c.stallIdx) % COLORS.length];
          c.phase = 0;
          c.t = 0;
        }
      }
    }
  });

  return (
    <>
      {cruiseFleet.map((c, i) => (
        <group key={c.lotId} ref={(g) => void (refs.current[i] = g)} position={[0, -20, 0]}>
          <ParkedCar stall={{ dx: 0, dz: 0, rotY: 0, color: c.color }} />
        </group>
      ))}
    </>
  );
}

export const ParkingLots = memo(function ParkingLots() {
  return (
    <>
      {PARKING_LOTS.map((lot) => (
        <LotMesh key={lot.id} lot={lot} />
      ))}
      <ParkingTraffic />
    </>
  );
});
