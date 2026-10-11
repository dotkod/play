"use client";

/**
 * Station passenger-information display: live next / following train ETAs.
 * One module-level canvas per station (shared by every screen at that stop).
 */

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { getLang } from "@/shared/lang";
import { LINE_COLOR, STATIONS, type LrtStation } from "../plan";
import { arrivalsAt, formatEta } from "../sim/eta";
import { LRT_STRINGS } from "../strings";

const W = 512;
const H = 320;

type PidBuf = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; key: string };

const bufs = new Map<string, PidBuf>();

function bufFor(id: string): PidBuf {
  let b = bufs.get(id);
  if (b) return b;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  b = { canvas, ctx, tex, key: "" };
  bufs.set(id, b);
  return b;
}

function paint(st: LrtStation) {
  const b = bufFor(st.id);
  const lang = getLang();
  const tr = LRT_STRINGS[lang];
  const rows = arrivalsAt(st.index);
  const name = lang === "ms" ? st.nameMs : st.nameEn;
  const g = b.ctx;

  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, W, H);
  g.fillStyle = LINE_COLOR;
  g.fillRect(0, 0, W, 48);
  g.fillStyle = "#fff";
  g.font = "800 22px system-ui, sans-serif";
  g.textAlign = "left";
  g.fillText(tr.lineName, 18, 32);

  g.fillStyle = "#f8fafc";
  g.font = "800 28px system-ui, sans-serif";
  g.fillText(name, 18, 88);

  g.fillStyle = "#64748b";
  g.font = "700 14px system-ui, sans-serif";
  g.fillText(tr.pidNow, 18, 118);
  g.textAlign = "right";
  g.fillText(tr.pidEta, W - 18, 118);
  g.textAlign = "left";

  g.strokeStyle = "#1e293b";
  g.beginPath();
  g.moveTo(18, 128);
  g.lineTo(W - 18, 128);
  g.stroke();

  const labels = [tr.pidNext, tr.pidThen];
  for (let i = 0; i < 2; i++) {
    const row = rows[i];
    const y = 168 + i * 70;
    g.fillStyle = i === 0 ? "#fbbf24" : "#94a3b8";
    g.font = "800 16px system-ui, sans-serif";
    g.fillText(labels[i]!, 18, y - 28);

    if (!row) {
      g.fillStyle = "#475569";
      g.font = "700 22px system-ui, sans-serif";
      g.fillText("—", 18, y);
      continue;
    }

    const dest = STATIONS[row.towardIndex]!;
    const destName = lang === "ms" ? dest.nameMs : dest.nameEn;
    let status: string;
    if (row.here && row.boarding) status = tr.pidBoarding;
    else if (row.here) status = tr.pidAtPlatform;
    else status = formatEta(row.etaSec, lang);

    g.fillStyle = "#e2e8f0";
    g.font = "800 26px system-ui, sans-serif";
    g.fillText(`${tr.pidTo} ${destName.replace(/^Stesen |^Station /i, "")}`, 18, y);

    g.fillStyle = row.here ? "#4ade80" : i === 0 ? "#fbbf24" : "#cbd5e1";
    g.font = "800 26px system-ui, sans-serif";
    g.textAlign = "right";
    g.fillText(status, W - 18, y);
    g.textAlign = "left";
  }

  const tick = Math.floor(performance.now() / 250);
  const key = `${lang}:${rows.map((r) => `${r.etaSec}:${r.towardIndex}:${r.here}:${r.boarding}`).join("|")}:${tick % 2}`;
  if (key !== b.key) {
    b.key = key;
    b.tex.needsUpdate = true;
  }
  return b.tex;
}

const PANEL_W = 2.8;
const PANEL_H = 1.75;

function PidPanel({
  st,
  pose,
}: {
  st: LrtStation;
  pose: { x: number; y: number; z: number; rotY: number };
}) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false, map: bufFor(st.id).tex }),
    [st.id],
  );

  return (
    <group position={[pose.x, pose.y, pose.z]} rotation={[0, pose.rotY, 0]}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[PANEL_W + 0.12, PANEL_H + 0.12, 0.08]} />
        <meshStandardMaterial color="#1f1a17" />
      </mesh>
      <mesh position={[0, 0, 0.01]} material={mat}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
      </mesh>
    </group>
  );
}

/** All PID screens for a station (concourse + platform). */
export function StationPid({ st }: { st: LrtStation }) {
  useFrame(() => {
    paint(st);
  });

  return (
    <>
      {st.pids.map((pose, i) => (
        <PidPanel key={i} st={st} pose={pose} />
      ))}
    </>
  );
}
