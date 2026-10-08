"use client";

import { useEffect, useState } from "react";
import { randomDrink } from "../drinks";
import { type GameState, initialState, type Party } from "../state";
import { randomParty } from "@/shared/three/look";
import MamakScene from "./mamak-scene";

// The shop keeps running behind the menus: seated regulars, Anne doing rounds, camera slowly orbiting
export default function DemoBackdrop({ poster = false }: { poster?: boolean }) {
  const [demo] = useState<GameState>(() => {
    const regular = (id: number, size: number): Party => ({
      id,
      guests: randomParty(size).map((look) => ({ look, order: randomDrink(0), served: false })),
      seed: 0,
      arrivedAt: 0,
      seatedAt: 0,
      revealUntil: 0,
      patienceMs: Number.MAX_SAFE_INTEGER,
      leaveAt: Number.MAX_SAFE_INTEGER,
      asks: 0,
    });
    // A busy-looking shop: a family, a couple, some solo regulars
    return { ...initialState, tables: [regular(1, 1), regular(2, 3), null, regular(4, 2), null, regular(6, 1)] };
  });
  const [serve, setServe] = useState<{ table: number; id: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setServe((p) => ({ table: [0, 1, 3, 5][Math.floor(Math.random() * 4)], id: (p?.id ?? 0) + 1 }));
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0">
      <MamakScene s={demo} cupReady={false} serveEvent={poster ? null : serve} onTable={() => {}} demo poster={poster} />
    </div>
  );
}
