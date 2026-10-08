"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useRef, useState } from "react";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import type * as THREE from "three";
import { City } from "./city";
import { input, view } from "./controls";
import { Pedestrians } from "./npcs";
import { Player } from "./player";
import { player, TrafficLights, Traffic } from "./traffic";
import { type Building, doorSpot } from "./world-data";

type Props = {
  spawn: { x: number; z: number; rotY: number };
  onZone: (b: Building | null) => void;
  // Fixed aerial shot for the OG image instead of the follow camera
  poster?: boolean;
  active?: boolean;
};

export default function World({ spawn, onZone, poster = false, active = true }: Props) {
  const [dpr, setDpr] = useState(1.5);
  const [shadows, setShadows] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const frameloop = useVisibleFrameloop(wrap);
  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas frameloop={frameloop} shadows dpr={dpr} camera={{ fov: 50, position: [spawn.x, 9, spawn.z + 11], near: 0.5, far: 220 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <PerformanceMonitor
          onDecline={() => {
            if (dpr > 1) setDpr(1);
            else setShadows(false);
          }}
        />
        <color attach="background" args={["#9fdcd2"]} />
        <fog attach="fog" args={["#9fdcd2", 45, 110]} />
        <hemisphereLight args={["#fffaf0", "#9db8a8", 1.4]} />
        <Sun shadows={shadows} />
        <City
          onBuilding={(b) => {
            // Tapping a building walks you to its door
            const d = doorSpot(b);
            input.target = { x: d.x, z: d.z };
          }}
        />
        <TapToWalk />
        <TrafficLights />
        <Traffic />
        <Pedestrians />
        <Player spawn={spawn} onZone={onZone} followCamera={!poster} active={active} />
        {poster && <PosterCamera />}
      </Canvas>
    </div>
  );
}

// The shadow camera follows the player so shadows stay crisp without a huge shadow map
const Sun = memo(function Sun({ shadows }: { shadows: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.position.set(player.x + 10, 18, player.z + 8);
    l.target.position.set(player.x, 0, player.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      intensity={2.2}
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-22}
      shadow-camera-right={22}
      shadow-camera-top={22}
      shadow-camera-bottom={-22}
      shadow-camera-far={60}
    />
  );
});

// Wide view over the junction with Restoran Anne Maju in frame
function PosterCamera() {
  useFrame(({ camera }) => {
    // Keep near-side buildings out of the shot
    view.cutaway = true;
    camera.position.set(9, 13, 13);
    camera.lookAt(10, 1, -5);
  });
  return null;
}

// Invisible floor that turns taps into a walk target
function TapToWalk() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onClick={(e) => {
        e.stopPropagation();
        input.target = { x: e.point.x, z: e.point.z };
      }}
    >
      <planeGeometry args={[90, 90]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
