"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import { LightingRig } from "@/city/components/lighting";
import { LrtGround } from "./ground";
import { LrtPlayer } from "./player";
import { LrtShuttleTick } from "./shuttle-tick";
import { LrtStations } from "./stations";
import { LrtTrain } from "./train";

type Props = {
  spawn: { x: number; z: number; rotY: number };
  active?: boolean;
  onToast: (kind: string) => void;
};

export default function LrtWorld({ spawn, active = true, onToast }: Props) {
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
        camera={{ fov: 50, position: [spawn.x, 14, spawn.z + 10], near: 0.5, far: 500 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <PerformanceMonitor
          onDecline={() => {
            if (dpr > 1) setDpr(1);
            else setShadows(false);
          }}
        />
        <LightingRig shadows={shadows} />
        <LrtShuttleTick active={active} />
        <LrtGround />
        <LrtStations />
        <LrtTrain active={active} />
        <LrtPlayer spawn={spawn} active={active} onToast={onToast} />
      </Canvas>
    </div>
  );
}
