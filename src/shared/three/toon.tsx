"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

let gradient: THREE.DataTexture | null = null;

// Three-step ramp gives the flat cel-shaded look
export function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const OUTLINE = 0.022;
const hullMaterial = new THREE.MeshBasicMaterial({ color: "#151515", side: THREE.BackSide });

type MeshProps = Omit<ThreeElements["mesh"], "args"> & { color: string; outline?: boolean };

export function ToonMaterial({ color }: { color: string }) {
  return <meshToonMaterial color={color} gradientMap={toonGradient()} />;
}

// Inverted hull: the same shape grown by OUTLINE on every side, rendered back faces only
const hullScale = (w: number, h: number, d: number): [number, number, number] => [
  (w + OUTLINE * 2) / w,
  (h + OUTLINE * 2) / h,
  (d + OUTLINE * 2) / d,
];

export function Box({ size, color, outline = true, ...props }: MeshProps & { size: [number, number, number] }) {
  return (
    <group {...(props as ThreeElements["group"])}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <ToonMaterial color={color} />
      </mesh>
      {outline && (
        <mesh scale={hullScale(...size)} material={hullMaterial}>
          <boxGeometry args={size} />
        </mesh>
      )}
    </group>
  );
}

export function RBox({
  size,
  radius = 0.06,
  color,
  outline = true,
  ...props
}: Omit<ThreeElements["group"], "args"> & { size: [number, number, number]; radius?: number; color: string; outline?: boolean }) {
  return (
    <group {...props}>
      <RoundedBox args={size} radius={radius} smoothness={3} castShadow receiveShadow>
        <ToonMaterial color={color} />
      </RoundedBox>
      {outline && <RoundedBox args={size} radius={radius} smoothness={3} scale={hullScale(...size)} material={hullMaterial} />}
    </group>
  );
}

export function Cyl({
  top,
  bottom,
  height,
  color,
  segments = 20,
  outline = true,
  ...props
}: MeshProps & { top: number; bottom: number; height: number; segments?: number }) {
  const r = Math.max(top, bottom);
  return (
    <group {...(props as ThreeElements["group"])}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[top, bottom, height, segments]} />
        <ToonMaterial color={color} />
      </mesh>
      {outline && (
        <mesh scale={hullScale(r * 2, height, r * 2)} material={hullMaterial}>
          <cylinderGeometry args={[top, bottom, height, segments]} />
        </mesh>
      )}
    </group>
  );
}

export function Ball({ radius, color, outline = true, ...props }: MeshProps & { radius: number }) {
  return (
    <group {...(props as ThreeElements["group"])}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, 20, 14]} />
        <ToonMaterial color={color} />
      </mesh>
      {outline && (
        <mesh scale={hullScale(radius * 2, radius * 2, radius * 2)} material={hullMaterial}>
          <sphereGeometry args={[radius, 20, 14]} />
        </mesh>
      )}
    </group>
  );
}
