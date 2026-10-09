"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import { Cats } from "@/hub/cats";
import { input, view } from "@/hub/controls";
import { NamedNpcs } from "@/hub/named-npcs";
import { Pedestrians } from "@/hub/npcs";
import { Player } from "@/hub/player";
import { Traffic, TrafficLights } from "@/hub/traffic";
import type { Building } from "@/world/districts/pusat-lepak/layout";
import { BintikScene } from "./districts/bukit-bintik/scene";
import { JalanScene } from "./districts/bukit-jalan/scene";
import { KampungScene } from "./districts/kampung-lepak/scene";
import { KlccScene, KlccSkylineImpostor } from "./districts/klcc/scene";
import { MenaraScene, MenaraSkylineImpostor } from "./districts/menara-lepak/scene";
import { PasarScene } from "./districts/pasar-besar/scene";
import { PetalingScene } from "./districts/petaling-lane/scene";
import { createWorldChunks, districtAt, type DistrictId } from "./districts/registry";
import { PusatScene } from "./districts/pusat-lepak/scene";
import { SentralScene } from "./districts/sentral-lepak/scene";
import { TamanScene } from "./districts/taman-ceria/scene";
import { TlxScene, TlxSkylineImpostor } from "./districts/tlx/scene";
import { clock, presetForFrac, syncClockFromDevice } from "./lighting";
import { PerfOverlay, PerfProbe } from "./perf-overlay";
import { setWalkRoute } from "@/core/walk-path";
import { player } from "./player-bridge";
import { ScatterTrees } from "./scatter-trees";

type Props = {
  spawn: { x: number; z: number; rotY: number };
  onZone: (b: Building | null) => void;
  onNearCat?: (index: number | null) => void;
  poster?: boolean;
  active?: boolean;
};

export function WorldRuntime({ spawn, onZone, onNearCat = noop, poster = false, active = true }: Props) {
  const [dpr, setDpr] = useState(1.5);
  const [shadows, setShadows] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const frameloop = useVisibleFrameloop(wrap);
  const chunks = useMemo(() => createWorldChunks(), []);

  return (
    <div ref={wrap} className="relative h-full w-full">
      <Canvas frameloop={frameloop} shadows dpr={dpr} camera={{ fov: 50, position: [spawn.x, 9, spawn.z + 11], near: 0.5, far: 420 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <PerformanceMonitor
          onDecline={() => {
            if (dpr > 1) setDpr(1);
            else setShadows(false);
          }}
        />
        <WorldSim active={active} chunks={chunks} />
        <LightingRig shadows={shadows} />
        <PusatScene />
        <ScatterTrees />
        <DistrictMount id="taman-ceria" near={() => player.x > 48}>
          <TamanScene />
        </DistrictMount>
        <DistrictMount id="klcc" near={() => player.z < -45}>
          <KlccScene />
        </DistrictMount>
        <DistrictMount id="menara-lepak" near={() => player.x < -42}>
          <MenaraScene />
        </DistrictMount>
        <DistrictMount id="tlx" near={() => player.x > 48 && player.z < -50}>
          <TlxScene />
        </DistrictMount>
        <DistrictMount id="bukit-bintik" near={() => player.x > 30 && player.z > 8}>
          <BintikScene />
        </DistrictMount>
        <DistrictMount id="bukit-jalan" near={() => player.z > 42}>
          <JalanScene />
        </DistrictMount>
        <DistrictMount id="kampung-lepak" near={() => player.x < -40 && player.z > 25}>
          <KampungScene />
        </DistrictMount>
        <DistrictMount id="pasar-besar" near={() => player.z > 38 && Math.abs(player.x) < 35}>
          <PasarScene />
        </DistrictMount>
        <DistrictMount id="petaling-lane" near={() => player.x > 14 && player.z < -10 && player.z > -50}>
          <PetalingScene />
        </DistrictMount>
        <DistrictMount id="sentral-lepak" near={() => player.x < -18 && player.z < -28}>
          <SentralScene />
        </DistrictMount>
        <SkylineGate show={() => player.z > -50}>
          <KlccSkylineImpostor />
        </SkylineGate>
        <SkylineGate show={() => player.x > -48}>
          <MenaraSkylineImpostor />
        </SkylineGate>
        <SkylineGate show={() => !(player.x > 48 && player.z < -50)}>
          <TlxSkylineImpostor />
        </SkylineGate>
        <Impostors chunks={chunks} />
        <TapToWalk />
        <TrafficLights />
        <Traffic />
        <Pedestrians />
        <NamedNpcs />
        <Cats onNear={onNearCat} />
        <Player spawn={spawn} onZone={onZone} followCamera={!poster} active={active} />
        {poster && <PosterCamera />}
        <PerfProbe />
      </Canvas>
      <PerfOverlay />
    </div>
  );
}

const noop = () => {};

function WorldSim({ active, chunks }: { active: boolean; chunks: ReturnType<typeof createWorldChunks> }) {
  useFrame(() => {
    clock.running = active;
    if (active) syncClockFromDevice();
    chunks.sync(player.x, player.z);
    player.districtId = districtAt(player.x, player.z);
  });
  return null;
}

const LightingRig = memo(function LightingRig({ shadows }: { shadows: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const fog = useRef<THREE.Fog>(null);
  const last = useRef("");

  useFrame(({ scene }) => {
    const p = presetForFrac();
    if (p.id !== last.current) {
      last.current = p.id;
      if (scene.background instanceof THREE.Color) scene.background.set(p.bg);
      else scene.background = new THREE.Color(p.bg);
      if (fog.current) {
        fog.current.color.set(p.fog);
        fog.current.near = p.fogNear;
        fog.current.far = p.fogFar;
      }
      if (hemi.current) {
        hemi.current.color.set(p.hemiSky);
        hemi.current.groundColor.set(p.hemiGround);
        hemi.current.intensity = p.hemiIntensity;
      }
      if (sun.current) {
        sun.current.intensity = p.sunIntensity;
        sun.current.color.set(p.sunColor);
      }
    }
    const l = sun.current;
    if (!l) return;
    l.position.set(player.x + 10, p.sunHeight, player.z + 8);
    l.target.position.set(player.x, 0, player.z);
    l.target.updateMatrixWorld();
  });

  const initial = presetForFrac();
  return (
    <>
      <color attach="background" args={[initial.bg]} />
      <fog ref={fog} attach="fog" args={[initial.fog, initial.fogNear, initial.fogFar]} />
      <hemisphereLight ref={hemi} args={[initial.hemiSky, initial.hemiGround, initial.hemiIntensity]} />
      <directionalLight
        ref={sun}
        intensity={initial.sunIntensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-far={60}
      />
    </>
  );
});

function DistrictMount({ id, near, children }: { id: DistrictId; near: () => boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.visible = near() || player.districtId === id;
  });
  return (
    <group ref={g} visible={false}>
      {children}
    </group>
  );
}

function SkylineGate({ show, children }: { show: () => boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.visible = show();
  });
  return <group ref={g}>{children}</group>;
}

function Impostors({ chunks }: { chunks: ReturnType<typeof createWorldChunks> }) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: "#7a8a92" }), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    while (g.children.length < chunks.impostors.length) {
      g.add(new THREE.Mesh(geo, mat));
    }
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i] as THREE.Mesh;
      const c = chunks.impostors[i];
      if (!c) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const w = c.maxX - c.minX;
      const d = c.maxZ - c.minZ;
      m.position.set(c.minX + w / 2, c.h / 2, c.minZ + d / 2);
      m.scale.set(w * 0.85, c.h, d * 0.85);
    }
  });

  return <group ref={group} />;
}

function PosterCamera() {
  useFrame(({ camera }) => {
    view.cutaway = true;
    camera.position.set(9, 13, 13);
    camera.lookAt(10, 1, -5);
  });
  return null;
}

function TapToWalk() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[10, 0.05, -10]}
      onClick={(e) => {
        e.stopPropagation();
        const to = { x: e.point.x, z: e.point.z };
        setWalkRoute({ x: player.x, z: player.z }, to);
        input.target = to;
      }}
    >
      <planeGeometry args={[300, 280]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
