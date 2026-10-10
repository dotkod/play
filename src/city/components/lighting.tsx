"use client";

/** Sun, sky light, fog and background from the time of day and live weather. */

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import * as THREE from "three";
import { atmosphere, lightModFor } from "@/world/atmosphere";
import { presetForFrac } from "@/world/lighting";
import { player } from "@/world/player-bridge";

export const LightingRig = memo(function LightingRig({ shadows }: { shadows: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const fog = useRef<THREE.Fog>(null);
  const last = useRef("");

  useFrame(({ scene }) => {
    const p = presetForFrac();
    const mod = lightModFor(p);
    const key = `${p.id}:${atmosphere.weather}:${atmosphere.haze}:${atmosphere.aqi ?? "-"}`;
    if (key !== last.current) {
      last.current = key;
      if (scene.background instanceof THREE.Color) scene.background.set(mod.bg);
      else scene.background = new THREE.Color(mod.bg);
      if (fog.current) {
        fog.current.color.set(mod.fog);
        fog.current.near = mod.fogNear;
        fog.current.far = mod.fogFar;
      }
      if (hemi.current) {
        hemi.current.color.set(p.hemiSky);
        hemi.current.groundColor.set(p.hemiGround);
        hemi.current.intensity = mod.hemiIntensity;
      }
      if (sun.current) {
        sun.current.intensity = mod.sunIntensity;
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
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
        shadow-intensity={0.55}
      />
    </>
  );
});
