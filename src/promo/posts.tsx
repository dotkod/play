"use client";

/**
 * Intro posts (1080 × 1080). Real game frames underneath, Kuala Lepak card style on top.
 * Copy in Bahasa Malaysia (house style: casual, no em dashes).
 */

import { useEffect, useState } from "react";
import { Wordmark } from "./brand";
import { ANNE, ANNE_CX, servingView } from "./scene";
import { PromoCity, shoot } from "./stage";

const URL = "kl.dotkod.com";
const HANDLE = "@kualalepak";

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="relative h-[1080px] w-[1080px] overflow-hidden bg-[#9fdcd2] font-sans text-[#1f1a17]">{children}</div>;
}

function useShot(run: () => Promise<void>) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    void run().then(() => {
      if (!live) return;
      setDone(true);
      (window as unknown as { __promoReady: boolean }).__promoReady = true;
    });
    return () => {
      live = false;
    };
  }, [run]);
  return done;
}

function Chip({ children, tone = "cream" }: { children: React.ReactNode; tone?: "cream" | "amber" | "chili" | "ink" }) {
  const c = { cream: "bg-[#fbf3e4] text-[#1f1a17]", amber: "bg-[#fcd34d] text-[#1f1a17]", chili: "bg-[#d8352a] text-white", ink: "bg-[#1f1a17] text-[#fbf3e4]" }[tone];
  return <span className={`rounded-full border-[5px] border-[#1f1a17] px-7 py-2 text-[34px] leading-none font-extrabold shadow-[0_7px_0_#1f1a17] ${c}`}>{children}</span>;
}

/** Post 1: welcome to the city. Golden-hour aerial over Anne Maju's junction. */
export function PostWelcome() {
  const done = useShot(() =>
    shoot({
      day: 0.6,
      at: 6,
      fov: 46,
      keys: [{ t: 0, pos: [ANNE_CX - 26, 27, ANNE.rect.minZ - 36], look: [ANNE_CX - 4, 0, ANNE.rect.minZ + 4] }],
    }),
  );
  return (
    <Frame>
      <div className="absolute inset-0">
        <PromoCity />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,170,80,0.28)_0%,rgba(0,0,0,0)_30%,rgba(31,26,23,0)_55%,rgba(31,26,23,0.5)_100%)]" />
      {done && (
        <>
          <div className="absolute top-[54px] left-1/2 -translate-x-1/2">
            <Wordmark scale={0.62} />
          </div>
          <div className="absolute inset-x-[54px] bottom-[54px] rounded-[44px] border-[6px] border-[#1f1a17] bg-[#fbf3e4] px-10 pt-8 pb-9 shadow-[0_12px_0_#1f1a17]">
            <p className="text-[34px] font-extrabold tracking-wide text-[#d8352a] uppercase">Bandar 3D ala Malaysia 🇲🇾</p>
            <p className="mt-1 text-[64px] leading-[1.02] font-extrabold">Jalan-jalan, cari kerja, lepak.</p>
            <p className="mt-3 text-[30px] leading-snug font-bold text-[#1f1a17]/70">Shophouse, mamak, LRT, rider merata. Main terus dalam browser, percuma.</p>
            <div className="mt-6 flex items-center gap-4">
              <Chip tone="amber">▶ {URL}</Chip>
              <Chip tone="ink">{HANDLE}</Chip>
            </div>
          </div>
        </>
      )}
    </Frame>
  );
}

/** Post 2: your first job, Anne Maju. The serving view with a lunchtime crowd. */
export function PostAnneMaju() {
  const v = servingView();
  const done = useShot(() =>
    shoot({
      day: 0.45,
      at: 2,
      inside: true,
      fov: 54,
      keys: [{ t: 0, pos: [v.pos.x, v.pos.y + 0.6, v.pos.z - 1.2], look: [v.look.x, v.look.y, v.look.z - 0.4] }],
    }),
  );
  return (
    <Frame>
      <div className="absolute inset-0">
        <PromoCity />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,26,23,0.55)_0%,rgba(31,26,23,0)_32%,rgba(31,26,23,0)_62%,rgba(31,26,23,0.6)_100%)]" />
      {done && (
        <>
          <div className="absolute top-[54px] left-[54px] flex flex-col items-start gap-4">
            <span className="-rotate-2 rounded-full border-[5px] border-[#1f1a17] bg-[#d8352a] px-7 py-2 text-[34px] font-extrabold text-white shadow-[0_7px_0_#1f1a17]">KERJA PERTAMA KAU</span>
            <p
              className="text-[96px] leading-[0.92] font-extrabold text-[#fcd34d]"
              style={{ WebkitTextStroke: "16px #1f1a17", paintOrder: "stroke fill" }}
            >
              Jadi anne
              <br />
              mamak 🍵
            </p>
          </div>
          {/* Order bubble, like in the game */}
          <div className="absolute top-[470px] right-[60px] max-w-[440px] rotate-2 rounded-[30px] border-[5px] border-[#1f1a17] bg-white px-7 py-5 text-[38px] leading-tight font-extrabold shadow-[0_8px_0_#1f1a17]">
            “Anne, teh tarik kurang manis satu!”
            <span className="absolute -bottom-[22px] left-16 size-9 rotate-45 border-r-[5px] border-b-[5px] border-[#1f1a17] bg-white" />
          </div>
          <div className="absolute inset-x-[54px] bottom-[54px] flex items-center justify-between rounded-[40px] border-[6px] border-[#1f1a17] bg-[#fbf3e4] px-8 py-6 shadow-[0_12px_0_#1f1a17]">
            <div>
              <p className="text-[46px] leading-none font-extrabold">90 saat. Dengar, bancuh, hantar.</p>
              <p className="mt-2 text-[28px] font-bold text-[#1f1a17]/65">Salah order? Pelanggan merajuk. Laju? Tip masyuk.</p>
            </div>
          </div>
          <div className="absolute top-[54px] right-[54px] flex flex-col items-end gap-3">
            <Chip tone="amber">{URL}</Chip>
            <Chip tone="ink">{HANDLE}</Chip>
          </div>
        </>
      )}
    </Frame>
  );
}
