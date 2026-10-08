"use client";

import { useEffect, useState } from "react";
import { randomDrink } from "../drinks";
import { type Customer, type GameState, initialState } from "../state";
import { randomLook } from "./look";
import MamakScene from "./mamak-scene";

// The shop keeps running behind the menus: seated regulars, Anne doing rounds, camera slowly orbiting
export default function DemoBackdrop() {
  const [demo] = useState<GameState>(() => {
    const regular = (id: number): Customer => ({
      id,
      look: randomLook(),
      order: randomDrink(0),
      phrase: "",
      arrivedAt: 0,
      seatedAt: 0,
      revealUntil: 0,
      leaveAt: Number.MAX_SAFE_INTEGER,
      askedAgain: false,
    });
    return { ...initialState, tables: [regular(1), null, regular(3), regular(4)] };
  });
  const [serve, setServe] = useState<{ table: number; id: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setServe((p) => ({ table: [0, 2, 3][Math.floor(Math.random() * 3)], id: (p?.id ?? 0) + 1 }));
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0">
      <MamakScene s={demo} cupReady={false} serveEvent={serve} onTable={() => {}} demo />
    </div>
  );
}
