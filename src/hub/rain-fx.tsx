"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { atmosphere } from "@/world/atmosphere";
import { player } from "@/world/player-bridge";

const COUNT = 900;
const SPREAD = 28;
const HEIGHT = 22;

/** Cheap local rain around the player — only when weather is rain/storm. */
export const RainFX = memo(function RainFX() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD;
      positions[i * 3 + 1] = Math.random() * HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
      speeds[i] = 14 + Math.random() * 18;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    (g as THREE.BufferGeometry & { userData: { speeds: Float32Array } }).userData = { speeds };
    return g;
  }, []);

  useFrame((_, rawDt) => {
    const pts = ref.current;
    if (!pts) return;
    const wet = atmosphere.weather === "rain" || atmosphere.weather === "storm";
    pts.visible = wet;
    if (!wet) return;
    const dt = Math.min(rawDt, 0.05);
    const storm = atmosphere.weather === "storm";
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const speeds = (pts.geometry.userData as { speeds: Float32Array }).speeds;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] -= speeds[i] * (storm ? 1.35 : 1) * dt;
      arr[i * 3] += (storm ? -2.2 : -1.1) * dt;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3] = (Math.random() - 0.5) * SPREAD;
        arr[i * 3 + 1] = HEIGHT * (0.55 + Math.random() * 0.45);
        arr[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
      }
    }
    pos.needsUpdate = true;
    pts.position.set(player.x, 0, player.z);
  });

  return (
    <points ref={ref} geometry={geo} visible={false} frustumCulled={false}>
      <pointsMaterial color="#c8d4e0" size={0.12} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
});
