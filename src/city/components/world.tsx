"use client";

/**
 * The v2 city world (Pusat Lepak, rebuilt). Same lighting, weather and controls as the
 * original city; everything placed in it comes from `src/city/plan`.
 */

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { RainFX } from "@/hub/rain-fx";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import { clock, syncClockFromDevice } from "@/world/lighting";
import { LightingRig } from "./lighting";
import type { CityBuilding } from "../plan";
import { CityBuildings } from "./buildings";
import { CityGround } from "./ground";
import { CityPedestrians } from "./pedestrians";
import { CityPlayer } from "./player";
import { StreetProps } from "./props";
import { CityTraffic } from "./traffic";

type Props = {
  spawn: { x: number; z: number; rotY: number };
  onZone: (b: CityBuilding | null) => void;
  active?: boolean;
  /** Fixed camera for the share image (no player). */
  poster?: boolean;
};

/** Share-image camera: high over the Anne Maju junction, looking along the street. */
function PosterCamera() {
  useFrame(({ camera }) => {
    camera.position.set(12, 26, -48);
    camera.lookAt(40, 0, -18);
  });
  return null;
}

/** Dev only: expose the camera and scene as window.__klThree for debugging. */
function DevHandle() {
  const three = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __klThree: unknown }).__klThree = three;
  }, [three]);
  return null;
}

function Clock({ active }: { active: boolean }) {
  useFrame(() => {
    clock.running = active;
    if (active) syncClockFromDevice();
  });
  return null;
}

export default function CityWorld({ spawn, onZone, active = true, poster = false }: Props) {
  const [dpr, setDpr] = useState(1.5);
  const [shadows, setShadows] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const frameloop = useVisibleFrameloop(wrap);
  return (
    <div ref={wrap} className="relative h-full w-full">
      <Canvas
        frameloop={frameloop}
        shadows
        dpr={dpr}
        camera={{ fov: 50, position: [spawn.x, 11, spawn.z + 8.5], near: 0.5, far: 380 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <PerformanceMonitor
          onDecline={() => {
            if (dpr > 1) setDpr(1);
            else setShadows(false);
          }}
        />
        <Clock active={active} />
        <DevHandle />
        <LightingRig shadows={shadows} />
        <CityGround />
        <CityBuildings />
        <StreetProps />
        <CityTraffic active={active} />
        <CityPedestrians />
        <RainFX />
        {poster ? <PosterCamera /> : <CityPlayer spawn={spawn} onZone={onZone} active={active} />}
      </Canvas>
    </div>
  );
}
