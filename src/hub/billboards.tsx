"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import * as THREE from "three";
import {
  BILLBOARD_ADS,
  BILLBOARD_AD_SECONDS,
  BILLBOARD_PANEL_W,
  BILLBOARD_SPOTS,
  type BillboardAd,
  type BillboardSpot,
} from "@/content/ads/billboards";
import { Box, Cyl, toonGradient } from "@/shared/three/toon";

/** Optional tap handler — wire a sheet later. */
let onBillboardTap: ((ad: BillboardAd, spotId: string) => void) | null = null;
export function setBillboardTapHandler(fn: ((ad: BillboardAd, spotId: string) => void) | null) {
  onBillboardTap = fn;
}

const PANEL_W = BILLBOARD_PANEL_W;
const PANEL_H = 2.6;
const POST_H = 6.8;

const textures = new Map<string, THREE.CanvasTexture>();

function adTexture(ad: BillboardAd) {
  const hit = textures.get(ad.id);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = ad.bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fillRect(0, 0, c.width, 28);
  g.fillRect(0, c.height - 28, c.width, 28);
  g.fillStyle = ad.fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "900 96px system-ui, sans-serif";
  g.fillText(ad.text, c.width / 2, ad.sub ? c.height / 2 - 40 : c.height / 2);
  if (ad.sub) {
    g.font = "800 52px system-ui, sans-serif";
    g.globalAlpha = 0.92;
    g.fillText(ad.sub, c.width / 2, c.height / 2 + 56);
    g.globalAlpha = 1;
  }
  if (ad.kind === "sponsor") {
    g.strokeStyle = ad.fg;
    g.lineWidth = 6;
    g.setLineDash([18, 12]);
    g.strokeRect(24, 24, c.width - 48, c.height - 48);
    g.setLineDash([]);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textures.set(ad.id, tex);
  return tex;
}

function adAt(elapsed: number, boardIndex: number) {
  const slot = Math.floor((elapsed + boardIndex * 12) / BILLBOARD_AD_SECONDS);
  return BILLBOARD_ADS[((slot % BILLBOARD_ADS.length) + BILLBOARD_ADS.length) % BILLBOARD_ADS.length];
}

export const Billboards = memo(function Billboards() {
  return (
    <group>
      {BILLBOARD_SPOTS.map((spot, i) => (
        <Billboard key={spot.id} spot={spot} index={i} />
      ))}
    </group>
  );
});

function Billboard({ spot, index }: { spot: BillboardSpot; index: number }) {
  const matA = useRef<THREE.MeshToonMaterial>(null);
  const matB = useRef<THREE.MeshToonMaterial>(null);
  const adId = useRef("");

  useFrame(({ clock }) => {
    const ad = adAt(clock.elapsedTime, index);
    if (ad.id === adId.current) return;
    adId.current = ad.id;
    const tex = adTexture(ad);
    if (matA.current) {
      matA.current.map = tex;
      matA.current.needsUpdate = true;
    }
    if (matB.current) {
      matB.current.map = tex;
      matB.current.needsUpdate = true;
    }
  });

  const first = adTexture(adAt(0, index));
  const panelY = POST_H - PANEL_H / 2 - 0.15;

  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, spot.rotY, 0]}>
      {/* Twin posts */}
      <Cyl top={0.12} bottom={0.16} height={POST_H} position={[-PANEL_W / 2 + 0.25, POST_H / 2, 0]} color="#5b6066" />
      <Cyl top={0.12} bottom={0.16} height={POST_H} position={[PANEL_W / 2 - 0.25, POST_H / 2, 0]} color="#5b6066" />
      <Box size={[PANEL_W + 0.4, 0.18, 0.18]} position={[0, POST_H - 0.1, 0]} color="#4a4f54" />
      {/* Frame */}
      <Box size={[PANEL_W + 0.25, PANEL_H + 0.25, 0.22]} position={[0, panelY, 0]} color="#2a2a2e" />
      {/* Double-sided face */}
      <mesh
        position={[0, panelY, 0.12]}
        onClick={(e) => {
          e.stopPropagation();
          const ad = BILLBOARD_ADS.find((a) => a.id === adId.current) ?? BILLBOARD_ADS[0];
          onBillboardTap?.(ad, spot.id);
        }}
      >
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshToonMaterial ref={matA} map={first} gradientMap={toonGradient()} />
      </mesh>
      <mesh
        position={[0, panelY, -0.12]}
        rotation={[0, Math.PI, 0]}
        onClick={(e) => {
          e.stopPropagation();
          const ad = BILLBOARD_ADS.find((a) => a.id === adId.current) ?? BILLBOARD_ADS[0];
          onBillboardTap?.(ad, spot.id);
        }}
      >
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshToonMaterial ref={matB} map={first} gradientMap={toonGradient()} />
      </mesh>
    </group>
  );
}
