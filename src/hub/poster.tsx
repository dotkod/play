"use client";

import dynamic from "next/dynamic";

const World = dynamic(() => import("./world"), { ssr: false });

const stroke = "[-webkit-text-stroke:10px_#1f1a17] [paint-order:stroke_fill]";
const noop = () => {};
const SPAWN = { x: 6.5, z: 4.6, rotY: Math.PI * 0.8 };

// 1200x630 share image: the live city with PLAY branding and what's inside
export function HubPoster() {
  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden">
      <World spawn={SPAWN} onZone={noop} poster />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent px-16">
        <span className="w-fit rounded-full bg-chili px-5 py-1.5 text-xl font-extrabold tracking-wide text-white uppercase">🇲🇾 Bandar game 3D</span>
        <h1 className={`text-[150px] leading-[0.85] font-extrabold text-amber-300 ${stroke}`}>▶ PLAY</h1>
        <p className="max-w-lg text-3xl font-bold text-cream">Jalan-jalan, masuk kedai, terus main. Percuma dalam browser.</p>
        <div className="mt-1 flex gap-3">
          <span className="rounded-2xl bg-amber-300 px-5 py-2.5 text-2xl font-extrabold text-ink shadow-[0_6px_0_#1f1a17]">🍵 Anne Maju</span>
          <span className="rounded-2xl bg-cream/90 px-5 py-2.5 text-2xl font-extrabold text-ink/70 shadow-[0_6px_0_#1f1a17]">🚇 Akan datang</span>
        </div>
      </div>
    </div>
  );
}
