"use client";

import { memo } from "react";
import * as THREE from "three";
import { Box, Cyl, RBox, toonGradient } from "@/shared/three/toon";
import { PETALING_BUS_STOP, PETALING_STREET } from "./meta";
import { PETALING_SHOPS, petalingFootprint, type PetalingShop } from "./buildings";

const texCache = new Map<string, THREE.CanvasTexture>();

function cachedTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, c: HTMLCanvasElement) => void) {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, c);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function shade(hex: string) {
  return "#" + new THREE.Color(hex).multiplyScalar(0.82).getHexString();
}

function facadeTex(s: PetalingShop) {
  const ppm = 40;
  return cachedTex(`petaling-facade:${s.id}`, Math.round(s.w * ppm), Math.round(s.h * ppm), (g, c) => {
    const W = c.width;
    const H = c.height;
    g.fillStyle = s.color;
    g.fillRect(0, 0, W, H);

    const ground = 2.8 * ppm;
    const shop = H - ground;

    const rows = Math.max(1, Math.floor((shop - 0.8 * ppm) / (1.4 * ppm)));
    const cols = Math.max(2, Math.floor(s.w / 1.5));
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const x = ((i + 0.5) / cols) * W - 0.4 * ppm;
        const y = 0.45 * ppm + r * 1.35 * ppm;
        g.fillStyle = "#2a4050";
        g.fillRect(x, y, 0.8 * ppm, 0.95 * ppm);
        g.fillStyle = "rgba(255,220,160,0.45)";
        g.fillRect(x + 3, y + 3, 0.28 * ppm, 0.95 * ppm - 6);
      }
    }

    const signY = shop - 1.05 * ppm;
    g.fillStyle = s.signBg;
    g.fillRect(0.25 * ppm, signY, W - 0.5 * ppm, 0.9 * ppm);
    g.fillStyle = "#f6d13a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 0.55 * ppm;
    do {
      g.font = `900 ${size}px system-ui, sans-serif`;
      size -= 2;
    } while (g.measureText(s.sign).width > W - ppm && size > 10);
    g.fillText(s.sign, W / 2, signY + 0.45 * ppm);

    g.fillStyle = "#3a2a20";
    g.fillRect(0.3 * ppm, shop + 0.1 * ppm, W - 0.6 * ppm, ground - 0.1 * ppm);
    g.fillStyle = "#6f8fa3";
    g.fillRect(0.5 * ppm, shop + 0.35 * ppm, W * 0.38, ground - 0.55 * ppm);
    g.fillStyle = "#1a1410";
    g.fillRect(W * 0.58, shop + 0.35 * ppm, W * 0.28, ground - 0.45 * ppm);
    g.fillStyle = "#c9a66b";
    g.fillRect(W * 0.58 + 4, shop + ground * 0.55, 8, 10);
  });
}

const ShopMesh = memo(function ShopMesh({ s }: { s: PetalingShop }) {
  const f = petalingFootprint(s);
  const facade = facadeTex(s);
  const frontX = f.front + s.faceX * 0.03;
  const yaw = s.faceX > 0 ? Math.PI / 2 : -Math.PI / 2;
  const awningDepth = s.w - 0.55;
  const awningX = f.front + s.faceX * 0.75;
  const postX = f.front + s.faceX * 1.15;

  return (
    <group>
      <RBox size={[s.w, s.h, s.d]} radius={0.06} position={[f.cx, s.h / 2, f.cz]} color={s.color} />
      <mesh position={[frontX, s.h / 2, s.z]} rotation={[0, yaw, 0]}>
        <planeGeometry args={[s.w - 0.08, s.h - 0.08]} />
        <meshToonMaterial map={facade} gradientMap={toonGradient()} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <Box size={[s.w + 0.25, 0.35, s.d + 0.25]} position={[f.cx, s.h + 0.18, f.cz]} color={shade(s.color)} />
      <Box size={[1.5, 0.12, awningDepth]} position={[awningX, 3.08, s.z]} color={s.awning} />
      {[-awningDepth * 0.38, awningDepth * 0.38].map((dz) => (
        <Cyl
          key={dz}
          top={0.05}
          bottom={0.06}
          height={3}
          position={[postX, 1.5, s.z + dz]}
          color="#5b6066"
          outline={false}
        />
      ))}
      {[-awningDepth * 0.28, 0, awningDepth * 0.28].map((dz) => (
        <group key={dz} position={[f.front + s.faceX * 0.55, 2.55, s.z + dz]}>
          <Cyl top={0.01} bottom={0.01} height={0.25} position={[0, 0.2, 0]} color="#4b5563" outline={false} />
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.18, 10, 8]} />
            <meshToonMaterial color="#c8372b" gradientMap={toonGradient()} />
          </mesh>
          <Cyl top={0.04} bottom={0.04} height={0.08} position={[0, -0.2, 0]} color="#f6d13a" outline={false} />
        </group>
      ))}
    </group>
  );
});

/** Lantern string — posts on the five-foot way, never in the carriageway. */
function LanternArch({ z }: { z: number }) {
  const mid = PETALING_STREET.x;
  const postL = mid - 4.55;
  const postR = mid + 4.55;
  return (
    <group>
      <Cyl top={0.05} bottom={0.07} height={4.4} position={[postL, 2.2, z]} color="#5b6066" outline={false} />
      <Cyl top={0.05} bottom={0.07} height={4.4} position={[postR, 2.2, z]} color="#5b6066" outline={false} />
      <Box size={[9.2, 0.06, 0.06]} position={[mid, 4.45, z]} color="#4b5563" outline={false} />
      {[-2.4, -0.8, 0.8, 2.4].map((dx, i) => (
        <group key={dx} position={[mid + dx, 4.0, z]}>
          <mesh>
            <sphereGeometry args={[0.2, 10, 8]} />
            <meshToonMaterial color={i % 2 === 0 ? "#c8372b" : "#f0a030"} gradientMap={toonGradient()} />
          </mesh>
          <Cyl top={0.03} bottom={0.03} height={0.06} position={[0, -0.22, 0]} color="#f6d13a" outline={false} />
        </group>
      ))}
    </group>
  );
}

/**
 * Petaling decoration only — asphalt / sidewalks come from city ROAD_STRIPS.
 * Extra ground planes here used to z-fight the junction (beige on grey, broken zebra).
 */
export const PetalingScene = memo(function PetalingScene() {
  return (
    <group>
      {PETALING_SHOPS.map((s) => (
        <ShopMesh key={s.id} s={s} />
      ))}

      {[-50.5, -44.5, -39].map((z) => (
        <LanternArch key={z} z={z} />
      ))}

      {/* Planters on five-foot way, clear of carriageway (±ROAD_HALF≈3) */}
      {[-53.5, -47.5, -41.5, -36.5].map((z) => (
        <group key={`p${z}`}>
          <RBox size={[0.55, 0.35, 0.55]} radius={0.05} position={[PETALING_STREET.x - 4.55, 0.18, z]} color="#8b5a3c" />
          <Cyl top={0.18} bottom={0.12} height={0.4} position={[PETALING_STREET.x - 4.55, 0.55, z]} color="#2f8f4e" outline={false} />
          <RBox size={[0.55, 0.35, 0.55]} radius={0.05} position={[PETALING_STREET.x + 4.55, 0.18, z]} color="#8b5a3c" />
          <Cyl top={0.18} bottom={0.12} height={0.4} position={[PETALING_STREET.x + 4.55, 0.55, z]} color="#2f8f4e" outline={false} />
        </group>
      ))}

      <group position={[PETALING_BUS_STOP.x, 0, PETALING_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#c8372b" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[3.6, 0.08, 1.0]} position={[0, 0.04, 0.15]} color="#9a9590" outline={false} />
      </group>
    </group>
  );
});
