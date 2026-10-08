"use client";

import { memo, useMemo, useState } from "react";
import { randomLook } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { BOUNDS, SIDEWALK_MID } from "./world-data";

type Walker = { axis: "x" | "z"; side: number; start: number; speed: number; phase: number };

// Pedestrians pace up and down the sidewalks, turning around at the ends of the street
export const Pedestrians = memo(function Pedestrians() {
  const [walkers] = useState(() =>
      Array.from({ length: 7 }, (_, i): Walker & { look: ReturnType<typeof randomLook> } => ({
        axis: i % 3 === 0 ? "z" : "x",
        side: (i % 2 ? 1 : -1) * (SIDEWALK_MID - 0.4),
        start: Math.random() * 1000,
        speed: 1.1 + Math.random() * 0.5,
        phase: Math.random(),
        look: randomLook(i === 4 ? "kid" : undefined),
      })),
  );
  return (
    <>
      {walkers.map((w, i) => (
        <Walking key={i} w={w} look={w.look} />
      ))}
    </>
  );
});

function Walking({ w, look }: { w: Walker; look: ReturnType<typeof randomLook> }) {
  const getPose = useMemo(() => {
    const span = BOUNDS * 2;
    return (): Pose => {
      const dist = (w.start + (performance.now() / 1000) * w.speed) % (span * 2);
      const forward = dist < span;
      const p = forward ? -BOUNDS + dist : BOUNDS - (dist - span);
      const dir = forward ? 1 : -1;
      return w.axis === "x"
        ? { x: p, z: w.side, rotY: dir > 0 ? Math.PI / 2 : -Math.PI / 2, walking: true, seated: false }
        : { x: w.side, z: p, rotY: dir > 0 ? 0 : Math.PI, walking: true, seated: false };
    };
  }, [w]);
  return <Person look={look} getPose={getPose} />;
}
