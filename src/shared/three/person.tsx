"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import type { Look } from "./look";
import { Box, Cyl, RBox } from "./toon";

export type Pose = {
  x: number;
  z: number;
  rotY: number;
  walking: boolean;
  seated: boolean;
  angry?: boolean;
  carrying?: boolean;
};

const HIP_STAND = 0.78;
const HIP_SEAT = 0.5;
const KID_SCALE = 0.7;

// Blocky WardRun-style rig. Pose is pulled every frame so walking never re-renders React.
export function Person({ look, getPose }: { look: Look; getPose: () => Pose }) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const brows = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const p = getPose();
    const t = clock.elapsedTime;
    if (!root.current || !hips.current || !legL.current || !legR.current || !armL.current || !armR.current) return;

    // Kids are scaled down; when seated, lift them so they still sit on the stool
    root.current.position.set(p.x, p.seated && look.kid ? HIP_SEAT * (1 - KID_SCALE) : 0, p.z);
    root.current.rotation.y = p.rotY;

    const swing = p.walking ? Math.sin(t * 11) * 0.65 : 0;
    if (p.seated) {
      hips.current.position.y = HIP_SEAT + Math.sin(t * 2 + p.x) * 0.008;
      legL.current.rotation.x = legR.current.rotation.x = -Math.PI / 2;
      armL.current.rotation.x = armR.current.rotation.x = -0.75;
      // Impatient customers drum the table
      if (p.angry) armR.current.rotation.x = -0.75 + Math.sin(t * 18) * 0.15;
    } else {
      hips.current.position.y = HIP_STAND + (p.walking ? Math.abs(Math.sin(t * 11)) * 0.04 : 0);
      legL.current.rotation.x = swing;
      legR.current.rotation.x = -swing;
      armL.current.rotation.x = p.carrying ? -1.3 : -swing * 0.8;
      armR.current.rotation.x = p.carrying ? -1.3 : swing * 0.8;
    }
    if (brows.current) brows.current.visible = !!p.angry;
    if (tray.current) tray.current.visible = !!p.carrying;
  });

  return (
    <group ref={root} scale={look.kid ? KID_SCALE : 1}>
      <group ref={hips}>
        <group ref={legL} position={[-0.12, 0, 0]}>
          <Box size={[0.17, 0.78, 0.2]} position={[0, -0.39, 0]} color={look.pants} />
        </group>
        <group ref={legR} position={[0.12, 0, 0]}>
          <Box size={[0.17, 0.78, 0.2]} position={[0, -0.39, 0]} color={look.pants} />
        </group>

        <RBox size={[0.52, 0.62, 0.3]} radius={0.05} position={[0, 0.33, 0]} color={look.shirt} />
        {/* Baju kurung: long top flaring over the hips */}
        {look.dress && <RBox size={[0.58, 0.3, 0.36]} radius={0.06} position={[0, 0.02, 0]} color={look.shirt} />}

        <group ref={armL} position={[-0.33, 0.58, 0]}>
          <Box size={[0.13, 0.52, 0.15]} position={[0, -0.24, 0]} color={look.shirt} />
          <Box size={[0.12, 0.1, 0.13]} position={[0, -0.53, 0]} color={look.skin} />
        </group>
        <group ref={armR} position={[0.33, 0.58, 0]}>
          <Box size={[0.13, 0.52, 0.15]} position={[0, -0.24, 0]} color={look.shirt} />
          <Box size={[0.12, 0.1, 0.13]} position={[0, -0.53, 0]} color={look.skin} />
        </group>

        <group ref={tray} position={[0, 0.62, 0.55]} visible={false}>
          <Cyl top={0.2} bottom={0.2} height={0.03} color="#b9bec4" />
          <Cyl top={0.07} bottom={0.055} height={0.16} position={[0, 0.095, 0]} color="#c9965f" />
        </group>

        <group position={[0, 0.88, 0]}>
          <RBox size={[0.44, 0.44, 0.42]} radius={0.09} color={look.skin} />
          {/* Face */}
          <Box size={[0.05, 0.08, 0.01]} position={[-0.09, 0.03, 0.212]} color="#111" outline={false} />
          <Box size={[0.05, 0.08, 0.01]} position={[0.09, 0.03, 0.212]} color="#111" outline={false} />
          <Box size={[0.1, 0.018, 0.01]} position={[0, -0.09, 0.212]} color="#5a2a22" outline={false} />
          <group ref={brows} visible={false}>
            <Box size={[0.09, 0.022, 0.01]} position={[-0.09, 0.1, 0.214]} rotation={[0, 0, -0.4]} color="#111" outline={false} />
            <Box size={[0.09, 0.022, 0.01]} position={[0.09, 0.1, 0.214]} rotation={[0, 0, 0.4]} color="#111" outline={false} />
          </group>
          <Headwear look={look} />
        </group>
      </group>
    </group>
  );
}

function Headwear({ look }: { look: Look }) {
  switch (look.headwear) {
    case "long":
      return (
        <>
          <RBox size={[0.48, 0.14, 0.46]} radius={0.05} position={[0, 0.2, -0.01]} color={look.hair} />
          <RBox size={[0.5, 0.62, 0.14]} radius={0.05} position={[0, -0.08, -0.19]} color={look.hair} />
          <Box size={[0.07, 0.42, 0.3]} position={[-0.245, 0.02, -0.06]} color={look.hair} />
          <Box size={[0.07, 0.42, 0.3]} position={[0.245, 0.02, -0.06]} color={look.hair} />
        </>
      );
    case "bun":
      return (
        <>
          <RBox size={[0.48, 0.14, 0.46]} radius={0.05} position={[0, 0.2, -0.01]} color={look.hair} />
          <RBox size={[0.48, 0.3, 0.1]} radius={0.04} position={[0, 0.08, -0.19]} color={look.hair} />
          <RBox size={[0.22, 0.2, 0.2]} radius={0.08} position={[0, 0.3, -0.18]} color={look.hair} />
        </>
      );
    case "ponytail":
      return (
        <>
          <RBox size={[0.48, 0.14, 0.46]} radius={0.05} position={[0, 0.2, -0.01]} color={look.hair} />
          <RBox size={[0.48, 0.3, 0.1]} radius={0.04} position={[0, 0.08, -0.19]} color={look.hair} />
          <RBox size={[0.12, 0.36, 0.12]} radius={0.05} position={[0, -0.02, -0.3]} rotation={[0.35, 0, 0]} color={look.hair} />
        </>
      );
    case "short":
    case "uncle":
      return (
        <>
          <RBox size={[0.48, 0.14, 0.46]} radius={0.05} position={[0, 0.2, -0.01]} color={look.hair} />
          <RBox size={[0.48, 0.32, 0.1]} radius={0.04} position={[0, 0.06, -0.19]} color={look.hair} />
        </>
      );
    case "tudung":
      return (
        <>
          <RBox size={[0.54, 0.56, 0.42]} radius={0.12} position={[0, 0.03, -0.06]} color={look.hair} />
          <RBox size={[0.6, 0.26, 0.38]} radius={0.08} position={[0, -0.3, -0.02]} color={look.hair} />
        </>
      );
    case "songkok":
      return <Cyl top={0.2} bottom={0.2} height={0.15} position={[0, 0.28, 0]} scale={[1.15, 1, 1]} color="#141414" />;
    case "cap":
      return (
        <>
          <RBox size={[0.48, 0.16, 0.46]} radius={0.06} position={[0, 0.22, -0.01]} color={look.hair} />
          <Box size={[0.4, 0.03, 0.2]} position={[0, 0.16, 0.3]} color={look.hair} />
        </>
      );
  }
}
