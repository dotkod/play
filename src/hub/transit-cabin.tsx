"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useVisibleFrameloop } from "@/shared/three/use-frameloop";
import { Box, Cyl, ToonMaterial } from "@/shared/three/toon";

export type CabinKind = "bus" | "rail" | "taxi";

type CabinTheme = {
  wall: string;
  floor: string;
  seat: string;
  seatTrim: string;
  accent: string;
  ceiling: string;
  pole: string;
};

const THEMES: Record<CabinKind, CabinTheme> = {
  bus: {
    wall: "#f4f1ea",
    floor: "#3a3f46",
    seat: "#d8352a",
    seatTrim: "#1f1a17",
    accent: "#fcd34d",
    ceiling: "#e8e4dc",
    pole: "#9aa3ab",
  },
  rail: {
    wall: "#e8eef4",
    floor: "#2a3038",
    seat: "#1f5fa8",
    seatTrim: "#152a44",
    accent: "#fcd34d",
    ceiling: "#dfe6ee",
    pole: "#c5ced8",
  },
  taxi: {
    wall: "#2a2420",
    floor: "#1a1512",
    seat: "#3a3028",
    seatTrim: "#fcd34d",
    accent: "#fcd34d",
    ceiling: "#1f1a17",
    pole: "#6b7178",
  },
};

const RIDE_MS: Record<CabinKind, number> = { bus: 2800, rail: 3000, taxi: 2600 };

/** Full-screen 3D cabin; parent handles teleport timing + HUD chrome. */
export function TransitCabinView({
  kind,
  accent,
  title,
  subtitle,
}: {
  kind: CabinKind;
  accent: string;
  title: string;
  subtitle: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const frameloop = useVisibleFrameloop(wrap);
  const theme = THEMES[kind];
  const themed = useMemo(() => ({ ...theme, accent }), [theme, accent]);

  return (
    <div ref={wrap} className="absolute inset-0 z-50 bg-[#0d121c]">
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        camera={{ fov: 62, position: [0, 1.35, 2.1], near: 0.1, far: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#6ec4e8"]} />
        <fog attach="fog" args={["#9fdcd2", 8, 28]} />
        <hemisphereLight args={["#fff6e8", "#6a7a88", 1.1]} />
        <directionalLight position={[2, 6, 3]} intensity={1.35} />
        <Cabin kind={kind} theme={themed} />
        <WindowWorld kind={kind} />
        <CabinCamera kind={kind} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-6 pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="text-center text-[1.35rem] font-extrabold tracking-tight text-cream">{title}</p>
        <p className="mt-1 text-center text-[13px] font-bold text-cream/65">{subtitle}</p>
        <div className="mx-auto mt-3 h-1 w-36 overflow-hidden rounded-full bg-cream/20">
          <RideBar accent={accent} ms={RIDE_MS[kind]} />
        </div>
      </div>
    </div>
  );
}

function RideBar({ accent, ms }: { accent: string; ms: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = "0%";
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      el.style.width = `${p * 100}%`;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ms]);
  return <div ref={ref} className="h-full w-0 rounded-full" style={{ backgroundColor: accent }} />;
}

function CabinCamera({ kind }: { kind: CabinKind }) {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const sway = kind === "taxi" ? 0.035 : 0.018;
    const bob = kind === "bus" ? 0.028 : 0.014;
    camera.position.x = Math.sin(t * 2.1) * sway;
    camera.position.y = 1.35 + Math.sin(t * 3.4) * bob;
    camera.position.z = 2.1 + Math.sin(t * 1.6) * 0.02;
    camera.lookAt(0, 1.2, -2.2);
  });
  return null;
}

const Cabin = memo(function Cabin({ kind, theme }: { kind: CabinKind; theme: CabinTheme }) {
  const wide = kind === "rail" ? 2.6 : kind === "bus" ? 2.4 : 1.9;
  const deep = kind === "taxi" ? 3.2 : 5.2;
  const seatZs = kind === "taxi" ? [0] : [-0.35, -1.55, -2.75];
  const poles = kind === "taxi" ? [] : [-0.9, -2.2];
  // Side walls are split so the mid band is open glass — scenery reads through
  const sillH = 0.85;
  const headerH = 0.45;
  const glassH = 1.0;
  return (
    <group>
      <Box size={[wide, 0.08, deep]} position={[0, 0, -1.2]} color={theme.floor} outline={false} />
      <Box size={[wide, 0.06, deep]} position={[0, 2.35, -1.2]} color={theme.ceiling} outline={false} />

      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <Box
            size={[0.08, sillH, deep]}
            position={[side * (wide / 2), sillH / 2, -1.2]}
            color={theme.wall}
            outline={false}
          />
          <Box
            size={[0.08, headerH, deep]}
            position={[side * (wide / 2), sillH + glassH + headerH / 2, -1.2]}
            color={theme.wall}
            outline={false}
          />
          {/* Window pillars */}
          {[-2.4, -1.2, 0, 1.0].map((z) => (
            <Box
              key={z}
              size={[0.1, glassH, 0.12]}
              position={[side * (wide / 2), sillH + glassH / 2, z - 0.4]}
              color={theme.wall}
              outline={false}
            />
          ))}
          <mesh position={[side * (wide / 2 - 0.01), sillH + glassH / 2, -1.1]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[deep * 0.9, glassH]} />
            <meshBasicMaterial color="#bfe6ef" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      <Box size={[wide, 2.3, 0.08]} position={[0, 1.15, -1.2 - deep / 2]} color={theme.wall} outline={false} />
      <Box size={[wide - 0.2, 0.55, 0.2]} position={[0, 0.9, 0.85]} color={theme.seatTrim} outline={false} />
      <Box size={[wide * 0.5, 0.12, 0.08]} position={[0, 1.55, 0.9]} color={theme.accent} outline={false} />

      {([-1, 1] as const).map((side) =>
        seatZs.map((z, i) => <Seat key={`${side}${i}`} x={side * (wide * 0.28)} z={z} theme={theme} />),
      )}

      {poles.map((z) => (
        <Cyl key={z} top={0.04} bottom={0.04} height={2.2} position={[0, 1.1, z]} color={theme.pole} outline={false} />
      ))}
      {kind !== "taxi" && (
        <Box size={[wide * 0.7, 0.05, 0.05]} position={[0, 2.15, -1.5]} color={theme.pole} outline={false} />
      )}

      <Box size={[0.7, 1.8, 0.06]} position={[wide / 2 - 0.02, 0.95, 0.2]} color={theme.accent} outline={false} />
    </group>
  );
});

function Seat({ x, z, theme }: { x: number; z: number; theme: CabinTheme }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.7, 0.22, 0.55]} position={[0, 0.45, 0]} color={theme.seat} />
      <Box size={[0.7, 0.55, 0.14]} position={[0, 0.85, -0.22]} color={theme.seat} />
      <Box size={[0.72, 0.06, 0.57]} position={[0, 0.36, 0]} color={theme.seatTrim} outline={false} />
    </group>
  );
}

function WindowWorld({ kind }: { kind: CabinKind }) {
  const group = useRef<THREE.Group>(null);
  const buildings = useMemo(() => {
    const out: { x: number; y: number; z: number; w: number; h: number; d: number; c: string }[] = [];
    const colors = ["#c5ced8", "#aeb8c4", "#e8a87c", "#d0d8e0", "#9eb4c8", "#f2c46b"];
    for (let i = 0; i < 28; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      out.push({
        x: side * (4.2 + (i % 5) * 0.35),
        y: 0.8 + (i % 4) * 0.55,
        z: -18 + i * 1.35,
        w: 0.9 + (i % 3) * 0.35,
        h: 1.4 + (i % 5) * 0.7,
        d: 0.8 + (i % 2) * 0.4,
        c: colors[i % colors.length],
      });
    }
    return out;
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const speed = kind === "taxi" ? 14 : kind === "bus" ? 10 : 16;
    g.position.z += speed * dt;
    if (g.position.z > 20) g.position.z -= 36;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -8]}>
        <planeGeometry args={[40, 50]} />
        <meshBasicMaterial color="#7a9a6a" />
      </mesh>
      <mesh position={[0, 6, -20]}>
        <planeGeometry args={[60, 20]} />
        <meshBasicMaterial color="#87c4e0" />
      </mesh>
      <group ref={group}>
        {buildings.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <ToonMaterial color={b.c} />
          </mesh>
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={`d${i}`} position={[0, 0.02, -16 + i * 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.35, 1.1]} />
            <meshBasicMaterial color="#f2d24b" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
