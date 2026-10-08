"use client";

import dynamic from "next/dynamic";
import { Logo } from "@/shared/logo";

const World = dynamic(() => import("./world"), { ssr: false });

const noop = () => {};
const SPAWN = { x: 6.5, z: 4.6, rotY: Math.PI * 0.8 };

// 1200x630 share image: the live city with PLAY branding and what's inside
export function HubPoster() {
  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden">
      <World spawn={SPAWN} onZone={noop} poster />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent px-16">
        <h1>
          <Logo size="poster" />
        </h1>
        <span className="w-fit rounded-full bg-chili px-5 py-1.5 text-2xl font-extrabold tracking-wide text-white">🇲🇾 Hidup, kerja, lepak.</span>
        <p className="max-w-lg text-3xl font-bold text-cream">Kau baru pindah ke sini. Cari kerja, kenal orang, jangan lupa usap Oyen.</p>
        <div className="mt-1 flex gap-3">
          <span className="rounded-2xl bg-amber-300 px-5 py-2.5 text-2xl font-extrabold text-ink shadow-[0_6px_0_#1f1a17]">🍵 Anne Maju</span>
        </div>
      </div>
    </div>
  );
}
