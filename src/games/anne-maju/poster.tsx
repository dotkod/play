"use client";

import dynamic from "next/dynamic";
import { GAME } from "./meta";

const DemoBackdrop = dynamic(() => import("./scene/demo-backdrop"), { ssr: false });

const stroke = "[-webkit-text-stroke:10px_#1f1a17] [paint-order:stroke_fill]";

// 1200x630 hero: live 3D shop on the right, big title on the left
// `bare` keeps only the scene + gradient, used as the background of per-score share cards
export function Poster({ bare = false }: { bare?: boolean }) {
  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden">
      <DemoBackdrop poster />
      <div className="absolute inset-0 flex flex-col justify-center gap-4 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent px-16">
        {!bare && (
          <>
        <span className="w-fit rounded-full bg-chili px-5 py-1.5 text-xl font-extrabold tracking-wide text-white uppercase">🇲🇾 Game mamak · 90 saat</span>
        <h1 className={`text-[128px] leading-[0.9] font-extrabold text-amber-300 ${stroke}`}>{GAME.name}</h1>
        <p className="max-w-lg text-3xl font-bold text-cream">Dengar order. Bancuh. Hantar. Berapa RM kau boleh kutip?</p>
        <span className="mt-2 w-fit rounded-2xl bg-amber-300 px-7 py-3 text-3xl font-extrabold text-ink shadow-[0_6px_0_#1f1a17]">▶ Main percuma</span>
          </>
        )}
      </div>
    </div>
  );
}
