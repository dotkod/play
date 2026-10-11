"use client";

/**
 * Passengers parented under the train group — local seats, no world lag vs the car.
 * Leave +x lz≈2.4 free for the player.
 */

import { useMemo } from "react";
import { Person, type Pose } from "@/shared/three/person";
import { randomLook, type Look } from "@/shared/three/look";
import { BENCH_SEAT_X, SEAT_ROOT_Y } from "../plan/constants";

type Pax = {
  lx: number;
  lz: number;
  localRot: number;
  look: Look;
};

function buildPassengers(): Pax[] {
  const seat = BENCH_SEAT_X;
  const looks = Array.from({ length: 6 }, () => randomLook());
  return [
    { lx: seat, lz: -5.0, localRot: -Math.PI / 2, look: looks[0]! },
    { lx: seat, lz: -3.2, localRot: -Math.PI / 2, look: looks[1]! },
    { lx: seat, lz: 4.2, localRot: -Math.PI / 2, look: looks[2]! },
    { lx: -seat, lz: -4.6, localRot: Math.PI / 2, look: looks[3]! },
    { lx: -seat, lz: 3.2, localRot: Math.PI / 2, look: looks[4]! },
    { lx: -seat, lz: 5.0, localRot: Math.PI / 2, look: looks[5]! },
  ];
}

function CabinPerson({ pax }: { pax: Pax }) {
  const getPose = useMemo(
    () =>
      (): Pose => ({
        x: 0,
        z: 0,
        rotY: 0,
        walking: false,
        seated: true,
      }),
    [],
  );

  return (
    <group position={[pax.lx, SEAT_ROOT_Y, pax.lz]} rotation={[0, pax.localRot, 0]}>
      <Person look={pax.look} getPose={getPose} />
    </group>
  );
}

export function CabinNpcs() {
  const list = useMemo(() => buildPassengers(), []);
  return (
    <>
      {list.map((p, i) => (
        <CabinPerson key={i} pax={p} />
      ))}
    </>
  );
}
