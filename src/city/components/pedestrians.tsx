"use client";

/** Townsfolk walking the sidewalk loops (see sim/peds.ts). */

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useState } from "react";
import { type Look, townsfolk } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { atmosphere } from "@/world/atmosphere";
import { player } from "@/world/player-bridge";
import { GRID } from "../plan";
import { createPeds, type Ped, PED_R, stepPeds } from "../sim/peds";
import { cityDynamic } from "./dynamic";

const COUNT = 14;
let crowd: Ped[] | null = null;
function getCrowd() {
  crowd ??= createPeds(GRID, COUNT);
  return crowd;
}

function Walker({ ped }: { ped: Ped }) {
  const [look] = useState<Look>(() => townsfolk(ped.kind));
  const getPose = useMemo(
    () => (): Pose => ({ x: ped.x, z: ped.z, rotY: ped.rot, walking: ped.walking, seated: false, masked: atmosphere.haze !== "none" }),
    [ped],
  );
  return <Person look={look} getPose={getPose} />;
}

export const CityPedestrians = memo(function CityPedestrians() {
  const peds = getCrowd();
  useFrame((_, delta) => {
    stepPeds(peds, Math.min(delta, 1 / 20), [{ x: player.x, z: player.z, r: 0.45 }]);
    cityDynamic.people = peds.map((p) => ({ x: p.x, z: p.z, r: PED_R }));
  });
  return (
    <group>
      {peds.map((p) => (
        <Walker key={p.id} ped={p} />
      ))}
    </group>
  );
});
