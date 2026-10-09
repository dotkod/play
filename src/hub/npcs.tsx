"use client";

import { memo, useMemo, useState } from "react";
import { type Look, type Townsfolk, townsfolk } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { BUS_STOP, dynamicColliders, STALL } from "./colliders";
import { BOUNDS, SIDEWALK_MID } from "./world-data";

type Walker = { axis: "x" | "z"; side: number; start: number; speed: number; look: Look };

// Who's out on the street, with how fast each type walks
const CAST: { kind: Townsfolk; speed: [number, number] }[] = [
  { kind: "office", speed: [1.3, 1.6] },
  { kind: "office", speed: [1.3, 1.6] },
  { kind: "student", speed: [1.2, 1.5] },
  { kind: "student", speed: [1.2, 1.5] },
  { kind: "auntie", speed: [0.9, 1.1] },
  { kind: "jogger", speed: [2.6, 3.1] },
  { kind: "elder", speed: [0.7, 0.9] },
  { kind: "umbrella", speed: [1.1, 1.3] },
  { kind: "kid", speed: [1.4, 1.7] },
  { kind: "auntie", speed: [0.9, 1.1] },
];

// Pedestrians pace up and down the sidewalks, turning around at the ends of the street
export const Pedestrians = memo(function Pedestrians() {
  const [walkers] = useState(() => {
    // Spread starts so walkers don't clump; keep them on the outer sidewalk (away from lanes)
    const byAxis = { x: 0, z: 0 };
    return CAST.map((c, i): Walker => {
      const axis: "x" | "z" = i % 3 === 0 ? "z" : "x";
      const slot = byAxis[axis]++;
      const side = (i % 2 ? 1 : -1) * (SIDEWALK_MID + 0.15 + (slot % 2) * 0.45);
      const start = (slot / Math.max(1, CAST.length / 2)) * (BOUNDS * 4) + i * 7.5;
      return {
        axis,
        side,
        start,
        speed: c.speed[0] + Math.random() * (c.speed[1] - c.speed[0]),
        look: townsfolk(c.kind),
      };
    });
  });
  return (
    <>
      {walkers.map((w, i) => (
        <Walking key={i} index={i} w={w} />
      ))}
      <StandingCrowd />
    </>
  );
});

function Walking({ index, w }: { index: number; w: Walker }) {
  const getPose = useMemo(() => {
    const span = BOUNDS * 2;
    return (): Pose => {
      const dist = (w.start + (performance.now() / 1000) * w.speed) % (span * 2);
      const forward = dist < span;
      const p = forward ? -BOUNDS + dist : BOUNDS - (dist - span);
      const dir = forward ? 1 : -1;
      dynamicColliders.people[index] = w.axis === "x" ? { x: p, z: w.side, r: 0.4 } : { x: w.side, z: p, r: 0.4 };
      return w.axis === "x"
        ? { x: p, z: w.side, rotY: dir > 0 ? Math.PI / 2 : -Math.PI / 2, walking: true, seated: false }
        : { x: w.side, z: p, rotY: dir > 0 ? 0 : Math.PI, walking: true, seated: false };
    };
  }, [w, index]);
  return <Person look={w.look} getPose={getPose} />;
}

// People waiting at the bus stop and buying nasi lemak; they stand still (their spots are static colliders)
function StandingCrowd() {
  // Makcik Kiah / Pakcik Osman are named NPCs; keep only ambient crowd here
  const [folk] = useState(() => [
    { look: townsfolk("office"), x: BUS_STOP.x - 1.2, z: BUS_STOP.z - 0.6, rotY: Math.PI },
    { look: townsfolk("student"), x: BUS_STOP.x + 0.1, z: BUS_STOP.z - 0.7, rotY: Math.PI + 0.3 },
    { look: townsfolk("office"), x: STALL.x + 1.5, z: STALL.z + 0.3, rotY: -Math.PI / 2 },
  ]);
  return (
    <>
      {folk.map((f, i) => (
        <Standing key={i} look={f.look} pose={{ x: f.x, z: f.z, rotY: f.rotY, walking: false, seated: false }} />
      ))}
    </>
  );
}

function Standing({ look, pose }: { look: Look; pose: Pose }) {
  const getPose = useMemo(() => () => pose, [pose]);
  return <Person look={look} getPose={getPose} />;
}
