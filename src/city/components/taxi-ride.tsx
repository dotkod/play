"use client";

/**
 * Dedicated Teksi Kumar car for a scripted ride (not traffic).
 * Shell has a passenger-door bay; a hinged panel swings open for board/alight.
 */

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { cachedParts, hullMaterial, kitMaterial } from "../kit/merge";
import { TAXI_RIDE_DOOR, taxiRideShellParts } from "../kit/vehicles";
import { taxi, taxiBusy } from "../sim/taxi-ride";

export const CityTaxiRide = memo(function CityTaxiRide() {
  const group = useRef<THREE.Group>(null);
  const door = useRef<THREE.Group>(null);
  const model = useMemo(() => cachedParts("taxi:ride-shell", () => taxiRideShellParts()), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const on = taxiBusy();
    g.visible = on;
    if (!on) return;
    g.position.set(taxi.x, 0, taxi.z);
    g.rotation.y = taxi.rotY;
    if (door.current) {
      // Swing outward toward the kerb (−Y), up to ~75°
      door.current.rotation.y = -taxi.door * 1.35;
    }
  });

  const d = TAXI_RIDE_DOOR;

  return (
    <group ref={group} visible={false}>
      <mesh geometry={model.body} material={kitMaterial()} castShadow />
      {model.hull && <mesh geometry={model.hull} material={hullMaterial()} />}
      <group ref={door} position={[d.hingeX, d.y, d.z]}>
        <mesh position={[-d.w / 2, 0, 0]} castShadow>
          <boxGeometry args={[d.w, d.h, d.d]} />
          <meshStandardMaterial color="#d8352a" />
        </mesh>
        <mesh position={[-d.w - 0.01, 0.06, 0]}>
          <boxGeometry args={[0.03, d.h * 0.55, d.d * 0.72]} />
          <meshStandardMaterial color="#5d7f99" transparent opacity={0.65} />
        </mesh>
      </group>
    </group>
  );
});
