"use client";

/**
 * Anne Maju played inside the city: the game's room renders in the city canvas (through the
 * mamak tunnel, inside the restaurant building) and the city camera glides to the serving
 * view, framed around the drink panel. No second canvas, no screen change.
 */

import { type RefObject, useEffect } from "react";
import { cityCamera } from "@/city/components/camera-override";
import { mamakTunnel, setMamakLive } from "@/city/components/mamak-room";
import { BUILDINGS, roomFrame, roomToWorld } from "@/city/plan";
import type { Look } from "@/shared/three/look";
import { GAME_CAMERA } from "./layout";
import { MamakContents, TableOverlays } from "./scene/mamak-scene";
import type { GameState } from "./state";

/** Matches the room fit used by the standalone camera rig. */
const FIT = { halfWidth: 5.9, distance: 9.6 };

function servingShot(panel: HTMLElement | null) {
  const b = BUILDINGS.find((x) => x.kind === "mamak");
  if (!b) return null;
  const f = roomFrame(b);
  const pos = roomToWorld(f, GAME_CAMERA.pos[0], GAME_CAMERA.pos[2]);
  const look = roomToWorld(f, GAME_CAMERA.look[0], GAME_CAMERA.look[2]);
  const r = panel?.getBoundingClientRect();
  // The drink panel sits on the right, or along the bottom on short/narrow screens
  const bottom = !!r && r.top > 4 && r.width >= window.innerWidth - 4;
  return {
    pos: { x: pos.x, y: GAME_CAMERA.pos[1], z: pos.z },
    look: { x: look.x, y: GAME_CAMERA.look[1], z: look.z },
    fitHalfWidth: FIT.halfWidth,
    fitDistance: FIT.distance,
    panel: { side: bottom ? ("bottom" as const) : ("right" as const), px: r ? (bottom ? r.height : r.width) : 0 },
  };
}

export function SeamlessRoom({
  s,
  serveEvent,
  onTable,
  anneLook,
  anchors,
  serving,
  panel,
  cupReady = false,
  pulseTable = null,
  overlays = serving,
}: {
  s: GameState;
  serveEvent: { table: number; id: number } | null;
  onTable: (i: number) => void;
  anneLook: Look;
  anchors: RefObject<(HTMLDivElement | null)[]>;
  /** Take the camera to the serving view. */
  serving: boolean;
  panel: RefObject<HTMLDivElement | null>;
  cupReady?: boolean;
  pulseTable?: number | null;
  /** Order bubbles over the tables. */
  overlays?: boolean;
}) {
  useEffect(() => {
    setMamakLive(true);
    return () => {
      setMamakLive(false);
      cityCamera.shot = null;
    };
  }, []);

  // Passive effect: runs after every ref in the commit is attached (the panel comes later in the tree)
  useEffect(() => {
    if (!serving) {
      cityCamera.shot = null;
      return;
    }
    const update = () => {
      cityCamera.shot = servingShot(panel.current);
    };
    update();
    const ro = new ResizeObserver(update);
    if (panel.current) ro.observe(panel.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      cityCamera.shot = null;
    };
  }, [serving, panel]);

  return (
    <>
      <mamakTunnel.In>
        <MamakContents s={s} serveEvent={serveEvent} onTable={onTable} anneLook={anneLook} anchors={overlays ? anchors : undefined} />
      </mamakTunnel.In>
      {overlays && (
        <div className="pointer-events-none absolute inset-0 z-10 [&_button]:pointer-events-auto">
          <TableOverlays s={s} cupReady={cupReady} onTable={onTable} pulseTable={pulseTable} anchors={anchors} />
        </div>
      )}
    </>
  );
}
