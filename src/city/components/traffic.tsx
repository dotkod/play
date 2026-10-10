"use client";

/**
 * Live traffic: steps the simulation every frame and moves one merged mesh per vehicle.
 * Shares the city clock with the traffic lights, brakes and honks for people in the road,
 * and publishes vehicle circles so the player can't walk through cars.
 */

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { ambience, sfx } from "@/shared/audio";
import { player } from "@/world/player-bridge";
import { LANES } from "../plan";
import { cachedParts, hullMaterial, kitMaterial } from "../kit/merge";
import { labelTexture } from "../kit/textures";
import { bikeParts, BRANDS, carParts, VAN_LABEL, vanParts } from "../kit/vehicles";
import { createTraffic, type Obstacle, stepTraffic, type Vehicle, vehicleCircles } from "../sim/traffic";
import { cityDynamic } from "./dynamic";

const SKINS = ["#c98d60", "#a96d47", "#e0b48a", "#8d5a3b"];

function modelFor(v: Vehicle) {
  if (v.kind === "bike") {
    const brand = v.look.brand ?? "grap";
    const skin = SKINS[v.id % SKINS.length];
    return cachedParts(`bike:${brand}:${skin}:${v.look.delivery}`, () => bikeParts(brand, skin, v.look.delivery !== false));
  }
  if (v.kind === "van") return cachedParts(`van:${v.look.brand}`, () => vanParts(v.look.brand ?? "lalamoov"));
  return cachedParts(`car:${v.look.car}:${v.look.paint}`, () => carParts(v.look.car ?? "sedan", v.look.paint ?? "#f2f2ee"));
}

const VehicleMesh = memo(function VehicleMesh({ v, bind }: { v: Vehicle; bind: (g: THREE.Group | null) => void }) {
  const model = useMemo(() => modelFor(v), [v]);
  const label = useMemo(() => {
    if (v.kind !== "van") return null;
    const b = BRANDS[v.look.brand ?? "lalamoov"];
    return labelTexture(b.name, b.main, b.text, VAN_LABEL.w / VAN_LABEL.h);
  }, [v]);
  return (
    <group ref={bind}>
      <mesh geometry={model.body} material={kitMaterial()} castShadow />
      {model.hull && <mesh geometry={model.hull} material={hullMaterial()} />}
      {label &&
        [1, -1].map((side) => (
          <mesh key={side} position={[side * VAN_LABEL.x, VAN_LABEL.y, VAN_LABEL.z]} rotation={[0, side * (Math.PI / 2), 0]}>
            <planeGeometry args={[VAN_LABEL.w, VAN_LABEL.h]} />
            <meshBasicMaterial map={label} toneMapped={false} />
          </mesh>
        ))}
    </group>
  );
});

const COUNT = 24;
let fleet: ReturnType<typeof createTraffic> | null = null;
/** One fleet per page: the simulation mutates it every frame, outside React. */
function getFleet() {
  fleet ??= createTraffic(LANES, COUNT);
  return fleet;
}

export const CityTraffic = memo(function CityTraffic({ active = true }: { active?: boolean }) {
  const traffic = getFleet();
  const groups = useRef<(THREE.Group | null)[]>([]);
  const engineTick = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = clock.elapsedTime;
    const people: Obstacle[] = [{ x: player.x, z: player.z, r: 0.45 }, ...cityDynamic.people];
    const honks = stepTraffic(traffic, dt, t, people);
    if (active && honks.length) {
      // Only honk if the honking car is near enough to hear
      const near = honks.some((id) => {
        const v = traffic.vehicles[id];
        return Math.hypot(v.x - player.x, v.z - player.z) < 25;
      });
      if (near) sfx.horn();
    }
    let nearest = Infinity;
    let nearestBike = false;
    traffic.vehicles.forEach((v, i) => {
      const g = groups.current[i];
      if (g) {
        g.position.set(v.x, 0, v.z);
        g.rotation.y = v.rot;
      }
      const d = Math.hypot(v.x - player.x, v.z - player.z);
      if (d < nearest && v.speed > 1) {
        nearest = d;
        nearestBike = v.kind === "bike";
      }
    });
    cityDynamic.vehicles = vehicleCircles(traffic);
    if (active && (engineTick.current = (engineTick.current + 1) % 6) === 0) ambience.setEngine(Math.max(0, 1 - nearest / 14), nearestBike);
  });

  return (
    <group>
      {traffic.vehicles.map((v, i) => (
        <VehicleMesh
          key={v.id}
          v={v}
          bind={(g) => {
            groups.current[i] = g;
          }}
        />
      ))}
    </group>
  );
});
