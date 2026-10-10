"use client";

/**
 * Anne Maju's dining room, placed inside its building in the city. When the job is open the
 * game renders its live room through `mamakTunnel` (same canvas, same lighting, no screen
 * change); otherwise an idle room shows: empty tables and Anne behind the counter.
 */

import { memo, useSyncExternalStore } from "react";
import tunnel from "tunnel-rat";
import { currentOutfit } from "@/games/anne-maju/progress";
import { MamakContents } from "@/games/anne-maju/scene/mamak-scene";
import { initialState } from "@/games/anne-maju/state";
import { ANNE_LOOK } from "@/shared/three/look";
import { BUILDINGS, roomFrame } from "../plan";

export const mamakTunnel = tunnel();

const listeners = new Set<() => void>();
let live = false;

/** The game calls this while it is mounted, so the city swaps the idle room for the live one. */
export function setMamakLive(on: boolean) {
  live = on;
  for (const l of listeners) l();
}

function useMamakLive() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => live,
    () => false,
  );
}

const noop = () => {};

const IdleRoom = memo(function IdleRoom() {
  return <MamakContents s={initialState} serveEvent={null} onTable={noop} anneLook={{ ...ANNE_LOOK, ...currentOutfit().look }} />;
});

export const MamakRoom = memo(function MamakRoom() {
  const isLive = useMamakLive();
  const b = BUILDINGS.find((x) => x.kind === "mamak");
  if (!b) return null;
  const f = roomFrame(b);
  return (
    <group position={[f.x, 0, f.z]} rotation={[0, f.rotY, 0]}>
      {isLive ? <mamakTunnel.Out /> : <IdleRoom />}
      {/* Fluorescent tubes: the room stays bright under the upper floor, day or night */}
      <pointLight position={[0, 3.3, -1]} intensity={14} distance={13} decay={1.4} color="#fff6e0" />
    </group>
  );
});
