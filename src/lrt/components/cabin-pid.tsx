"use client";

/**
 * Cabin TVs — 16:9 station PID (destination ticket + next/now stop). Big type.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { getLang } from "@/shared/lang";
import { LINE_COLOR, STATIONS, TRAIN_WIDTH } from "../plan";
import { getShuttle } from "../sim/shuttle";
import { LRT_STRINGS } from "../strings";
import { fare } from "./fare";

/** 16:9 canvas */
const W = 1280;
const H = 720;
const ASPECT = W / H;
const PAD = 48;

type Buf = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; key: string };

let buf: Buf | null = null;

function getBuf(): Buf {
  if (buf && buf.canvas.width === W && buf.canvas.height === H) return buf;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  buf = { canvas, ctx, tex, key: "" };
  return buf;
}

function shortName(lang: "ms" | "en", index: number) {
  const st = STATIONS[index]!;
  const raw = lang === "ms" ? st.nameMs : st.nameEn;
  return raw.replace(/^Stesen |^Station /i, "");
}

function shortById(lang: "ms" | "en", id: string | null) {
  if (!id) return "";
  const st = STATIONS.find((s) => s.id === id);
  if (!st) return "";
  return (lang === "ms" ? st.nameMs : st.nameEn).replace(/^Stesen |^Station /i, "");
}

function fitFont(
  g: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  weight: number,
  px: number,
  minPx: number,
) {
  let size = px;
  while (size > minPx) {
    g.font = `${weight} ${size}px system-ui, sans-serif`;
    if (g.measureText(text).width <= maxW) return size;
    size -= 4;
  }
  g.font = `${weight} ${minPx}px system-ui, sans-serif`;
  return minPx;
}

function paint() {
  const b = getBuf();
  const lang = getLang();
  const tr = LRT_STRINGS[lang];
  const st = getShuttle();
  const g = b.ctx;
  const now = performance.now();

  const nextIndex = st.targetIndex;
  const atIndex = st.atStopId ? STATIONS.findIndex((s) => s.id === st.atStopId) : -1;
  const atStop = st.phase === "dwell" && atIndex >= 0;
  const atDest = atStop && !!fare.destId && st.atStopId === fare.destId;
  const blink = Math.floor(now / 400) % 2 === 0;
  const destName = shortById(lang, fare.destId);
  const stopName = shortName(lang, atStop ? atIndex : nextIndex);

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);

  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, W, H);
  g.fillStyle = LINE_COLOR;
  g.fillRect(0, 0, W, 14);

  g.textBaseline = "middle";
  g.textAlign = "center";

  if (fare.destId && destName) {
    // Ticket destination is the hero
    g.fillStyle = "#94a3b8";
    fitFont(g, tr.cabinGoingTo, W - PAD * 2, 800, 48, 32);
    g.fillText(tr.cabinGoingTo, W / 2, H * 0.2);

    g.fillStyle = "#fbbf24";
    fitFont(g, destName, W - PAD * 2, 900, 150, 72);
    g.fillText(destName, W / 2, H * 0.48);

    if (atDest && st.doorsOpen) {
      g.fillStyle = blink ? "#4ade80" : "#86efac";
      fitFont(g, tr.cabinAlightHere, W - PAD * 2, 800, 52, 32);
      g.fillText(tr.cabinAlightHere, W / 2, H * 0.78);
    } else if (atStop) {
      g.fillStyle = "#cbd5e1";
      fitFont(g, `${tr.cabinNowAt}: ${stopName}`, W - PAD * 2, 700, 40, 26);
      g.fillText(`${tr.cabinNowAt}: ${stopName}`, W / 2, H * 0.78);
    } else {
      g.fillStyle = "#94a3b8";
      fitFont(g, `${tr.cabinNextStop}: ${stopName}`, W - PAD * 2, 700, 40, 26);
      g.fillText(`${tr.cabinNextStop}: ${stopName}`, W / 2, H * 0.78);
    }
  } else {
    const label = atStop ? tr.cabinNowAt : tr.cabinNextStop;
    g.fillStyle = "#94a3b8";
    fitFont(g, label, W - PAD * 2, 800, 56, 36);
    g.fillText(label, W / 2, H * 0.22);

    g.fillStyle = "#fbbf24";
    fitFont(g, stopName, W - PAD * 2, 900, 160, 72);
    g.fillText(stopName, W / 2, H * 0.52);

    const side = st.dir > 0 ? tr.cabinDirEast : tr.cabinDirWest;
    g.fillStyle = "#e2e8f0";
    fitFont(g, side, W * 0.7, 800, 48, 28);
    g.fillText(side, W / 2, H * 0.78);
  }

  g.textAlign = "left";
  g.textBaseline = "alphabetic";

  const key = `${lang}:${st.phase}:${st.atStopId}:${st.targetIndex}:${st.doorsOpen}:${fare.destId}:${blink ? 1 : 0}`;
  if (key !== b.key) {
    b.key = key;
    b.tex.needsUpdate = true;
  }
  return b.tex;
}

const END_W = 1.42;
const END_H = END_W / ASPECT;
const SIDE_W = 1.15;
const SIDE_H = SIDE_W / ASPECT;
const SIDE_X = -(TRAIN_WIDTH / 2 - 0.4);

function TvPanel({
  x,
  y,
  z,
  rotY,
  w,
  h,
  mat,
}: {
  x: number;
  y: number;
  z: number;
  rotY: number;
  w: number;
  h: number;
  mat: THREE.MeshBasicMaterial;
}) {
  const bezel = 0.06;
  const depth = 0.07;
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[w + bezel * 2, h + bezel * 2, depth]} />
        <meshStandardMaterial color="#1a1816" roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[w + 0.03, h + 0.03, 0.02]} />
        <meshStandardMaterial color="#0c0b0a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.012]} material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh position={[0, h / 2 + bezel * 0.35, 0.01]}>
        <boxGeometry args={[w + bezel * 1.6, 0.018, 0.02]} />
        <meshStandardMaterial color={LINE_COLOR} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function CabinPid() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, map: getBuf().tex }), []);

  useFrame(() => {
    paint();
  });

  const boards = [
    { x: 0, y: 2.05, z: 7.45, rotY: Math.PI, w: END_W, h: END_H },
    { x: 0, y: 2.05, z: -7.45, rotY: 0, w: END_W, h: END_H },
    { x: SIDE_X, y: 2.12, z: 0, rotY: -Math.PI / 2, w: SIDE_W, h: SIDE_H },
  ];

  return (
    <>
      {boards.map((b, i) => (
        <TvPanel key={i} {...b} mat={mat} />
      ))}
    </>
  );
}
