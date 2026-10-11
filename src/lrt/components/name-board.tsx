"use client";

/**
 * Station name boards: street fascia + canopy top + platform ends.
 * One module-level canvas texture per station (shared by every board at that stop).
 */

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { getLang } from "@/shared/lang";
import { LINE_COLOR, type LrtStation, type NameBoard } from "../plan";
import { LRT_STRINGS } from "../strings";

const W = 1024;
const H = 256;

type Buf = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; key: string };

const bufs = new Map<string, Buf>();

function bufFor(id: string): Buf {
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
  tex.anisotropy = 4;
  b = { canvas, ctx, tex, key: "" };
  bufs.set(id, b);
  return b;
}

function paint(st: LrtStation) {
  const b = bufFor(st.id);
  const lang = getLang();
  const tr = LRT_STRINGS[lang];
  const name = lang === "ms" ? st.nameMs : st.nameEn;
  const g = b.ctx;

  g.fillStyle = "#f3efe4";
  g.fillRect(0, 0, W, H);
  g.fillStyle = LINE_COLOR;
  g.fillRect(0, 0, W, 36);
  g.fillRect(0, H - 22, W, 22);

  g.fillStyle = "#fff";
  g.font = "800 22px system-ui, sans-serif";
  g.textAlign = "left";
  g.fillText(tr.lineName, 32, 26);

  g.fillStyle = "#1f1a17";
  g.font = "900 92px system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText(name, W / 2, H / 2 + 28);

  g.fillStyle = LINE_COLOR;
  g.fillRect(32, H - 48, 96, 10);

  const key = `${lang}:${name}`;
  if (key !== b.key) {
    b.key = key;
    b.tex.needsUpdate = true;
  }
  return b.tex;
}

const SIZE: Record<NameBoard["kind"], { w: number; h: number }> = {
  street: { w: 11.2, h: 1.7 },
  canopy: { w: 12.5, h: 3.4 },
  platform: { w: 2.8, h: 1.15 },
};

function BoardPanel({ st, board }: { st: LrtStation; board: NameBoard }) {
  const size = SIZE[board.kind];
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: bufFor(st.id).tex,
        side: THREE.DoubleSide,
      }),
    [st.id],
  );

  return (
    <group position={[board.x, board.y, board.z]} rotation={[board.rotX ?? 0, board.rotY, 0]}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[size.w + 0.2, size.h + 0.2, 0.1]} />
        <meshStandardMaterial color="#1f1a17" />
      </mesh>
      <mesh position={[0, 0, 0.02]} material={mat}>
        <planeGeometry args={[size.w, size.h]} />
      </mesh>
    </group>
  );
}

/** Street / canopy / platform name boards for one station. */
export function StationNameBoards({ st }: { st: LrtStation }) {
  useFrame(() => {
    paint(st);
  });

  return (
    <>
      {st.nameBoards.map((board, i) => (
        <BoardPanel key={i} st={st} board={board} />
      ))}
    </>
  );
}
