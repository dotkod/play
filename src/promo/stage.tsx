"use client";

/**
 * The live city for marketing renders, stepped frame by frame through `window.__klPromo`.
 * `ready` resolves once the canvas and bridge exist.
 */

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { MamakContents } from "@/games/anne-maju/scene/mamak-scene";
import { ANNE_LOOK } from "@/shared/three/look";
import { mamakTunnel, setMamakLive } from "@/city/components/mamak-room";
import type { PromoBridge } from "@/city/components/world";
import { SPAWN } from "@/city/plan";
import { busyMamak, cameraAt, insideShop, type Key, setTimeOfDay } from "./scene";

const CityWorld = dynamic(() => import("@/city/components/world"), { ssr: false });

const noop = () => {};
const BUSY = busyMamak();

export function bridge(): Promise<PromoBridge> {
  return new Promise((resolve) => {
    const poll = () => {
      const b = (window as unknown as { __klPromo?: PromoBridge }).__klPromo;
      if (b) resolve(b);
      else setTimeout(poll, 50);
    };
    poll();
  });
}

/** Simulate from t=0 to `until` (traffic, people, lights), then frame the shot. */
export async function shoot(opts: { keys: Key[]; at: number; until?: number; day: number; inside?: boolean; fov?: number }) {
  const b = await bridge();
  setTimeOfDay(opts.day);
  insideShop(!!opts.inside);
  const end = opts.until ?? opts.at;
  for (let t = 0; t <= end; t += 1 / 30) {
    const c = cameraAt(opts.keys, Math.min(t, opts.at));
    b.camera.fov = opts.fov ?? 50;
    b.camera.updateProjectionMatrix();
    b.camera.position.copy(c.pos);
    b.camera.lookAt(c.look);
    b.advance(t);
  }
  // Fonts and textures may finish loading late: render the final frame again
  await new Promise((r) => setTimeout(r, 400));
  b.advance(end + 1 / 30);
}

/** The city canvas, plus a lunchtime crowd inside Anne Maju. */
export function PromoCity() {
  useEffect(() => {
    setMamakLive(true);
    return () => setMamakLive(false);
  }, []);
  return (
    <>
      <CityWorld spawn={SPAWN} onZone={noop} promo />
      <mamakTunnel.In>
        <MamakContents s={BUSY} serveEvent={null} onTable={noop} anneLook={ANNE_LOOK} />
      </mamakTunnel.In>
    </>
  );
}
