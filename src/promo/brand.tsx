"use client";

/**
 * Kuala Lepak brand art for social accounts. Everything is sized for a 1080 px square and
 * keeps its content inside the centre circle so Instagram's round crop never cuts it.
 */

import { type ReactNode, useEffect } from "react";

const FONT = "var(--font-baloo), ui-rounded, system-ui, sans-serif";

/**
 * Outlined lettering as SVG text: round stroke joins (CSS text-stroke uses mitred joins,
 * which leave spikes on K and A at large sizes).
 */
function Outlined({ text, size, fill, stroke, spacing = 0, y }: { text: string; size: number; fill: string; stroke: number; spacing?: number; y: number }) {
  return (
    <text
      x="50%"
      y={y}
      textAnchor="middle"
      fontFamily={FONT}
      fontWeight={800}
      fontSize={size}
      letterSpacing={spacing}
      fill={fill}
      stroke="#1f1a17"
      strokeWidth={stroke}
      strokeLinejoin="round"
      strokeLinecap="round"
      paintOrder="stroke fill"
    >
      {text}
    </text>
  );
}

/** The stacked wordmark: red KUALA over a big yellow LEPAK, both outlined in ink. */
export function Wordmark({ scale = 1, tilt = -4 }: { scale?: number; tilt?: number }) {
  const w = 980 * scale;
  const h = 470 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 980 470" style={{ transform: `rotate(${tilt}deg)`, overflow: "visible" }} aria-label="Kuala Lepak">
      {/* Chunky drop shadow under LEPAK */}
      <g transform="translate(0 14)" opacity="0.9">
        <Outlined text="LEPAK" size={300} fill="#1f1a17" stroke={44} spacing={4} y={440} />
      </g>
      <Outlined text="KUALA" size={124} fill="#d8352a" stroke={26} spacing={10} y={150} />
      <Outlined text="LEPAK" size={300} fill="#fcd34d" stroke={40} spacing={4} y={440} />
    </svg>
  );
}

/** Shophouse-and-tower skyline along the bottom, in the city's own palette. */
function Skyline({ color = "#1f1a17", opacity = 1 }: { color?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 1080 300" className="absolute inset-x-0 bottom-0 w-full" style={{ opacity }} aria-hidden>
      <g fill={color}>
        <rect x="0" y="170" width="120" height="130" />
        <rect x="118" y="140" width="96" height="160" />
        <rect x="212" y="60" width="110" height="240" />
        <rect x="236" y="30" width="62" height="40" />
        <rect x="262" y="0" width="10" height="34" />
        <rect x="320" y="150" width="104" height="150" />
        <rect x="422" y="120" width="98" height="180" />
        <rect x="518" y="160" width="120" height="140" />
        <rect x="636" y="70" width="128" height="230" />
        <rect x="762" y="135" width="100" height="165" />
        <rect x="860" y="100" width="90" height="200" />
        <rect x="948" y="160" width="132" height="140" />
      </g>
      <g fill="#fcd34d" opacity="0.9">
        {[
          [240, 90],
          [276, 90],
          [240, 130],
          [276, 170],
          [660, 100],
          [700, 140],
          [740, 100],
          [660, 180],
          [880, 130],
          [910, 170],
          [140, 170],
          [440, 150],
          [470, 190],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="18" height="24" rx="3" />
        ))}
      </g>
    </svg>
  );
}

function Square({ children, bg }: { children: ReactNode; bg: string }) {
  return (
    <div className="relative grid h-[1080px] w-[1080px] place-items-center overflow-hidden" style={{ background: bg }}>
      {children}
    </div>
  );
}

const SUNSET = "radial-gradient(circle at 50% 38%, #ffe7a3 0%, #ffb347 38%, #ff7a3d 70%, #e2493b 100%)";

/** Profile picture, option A: the wordmark on a sunset with the skyline. */
export function AvatarWordmark() {
  return (
    <Square bg={SUNSET}>
      <div className="absolute top-[150px] h-[360px] w-[360px] rounded-full bg-[#fff1c2]/60 blur-[2px]" />
      <Skyline />
      <div className="relative -mt-[90px]">
        <Wordmark scale={0.86} />
      </div>
    </Square>
  );
}

/** Profile picture, option B: a bold KL monogram badge, readable even at 40 px. */
export function AvatarMonogram() {
  return (
    <Square bg="#9fdcd2">
      <Skyline color="#2f8f86" opacity={0.55} />
      <div className="relative grid h-[780px] w-[780px] place-items-center rounded-full border-[26px] border-[#1f1a17] bg-[#fcd34d] shadow-[0_26px_0_#1f1a17]">
        <svg width="620" height="620" viewBox="0 0 620 620" className="absolute" style={{ transform: "rotate(-6deg)", overflow: "visible" }} aria-label="KL">
          <Outlined text="KL" size={400} fill="#d8352a" stroke={44} y={400} />
          <g transform="translate(0 0)">
            <rect x="160" y="452" width="300" height="104" rx="52" fill="#1f1a17" />
            <rect x="160" y="440" width="300" height="104" rx="52" fill="#fbf3e4" stroke="#1f1a17" strokeWidth="12" />
            <text x="310" y="510" textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontWeight={800} fontSize="64" letterSpacing="8" fill="#1f1a17">
              LEPAK
            </text>
          </g>
        </svg>
      </div>
    </Square>
  );
}

/** Transparent wordmark for overlays (videos, stories, stickers). */
export function WordmarkTransparent() {
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);
  return (
    <div className="grid h-[1080px] w-[1920px] place-items-center bg-transparent">
      <Wordmark scale={1.5} />
    </div>
  );
}
