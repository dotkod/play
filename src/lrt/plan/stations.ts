/**
 * Three sandbox stations on the elevated Kelana parody line.
 * Each station is derived from its path position — no hand-typed one-offs in components.
 *
 * Layout (north → south): track → platform → lift → outer-sidewalk plaza.
 * Vertical access is the lift only (no stair ramp over the plaza).
 */

import { PLAT_BACK_Z, PLAT_EDGE_Z, PLATFORM_ALONG, PLATFORM_Y, STREET_Z0, STREET_Z1, TRACK_Z } from "./constants";
import { samplePath, stationS } from "./path";

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });
export const inRect = (x: number, z: number, r: Rect) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

export type NameBoard = {
  x: number;
  y: number;
  z: number;
  rotY: number;
  /** Tip face toward sky/camera (street boards); 0 = vertical. */
  rotX?: number;
  kind: "street" | "platform" | "canopy";
};

export type LrtStation = {
  id: string;
  index: number;
  /** Distance along guideway path. */
  s: number;
  x: number;
  nameMs: string;
  nameEn: string;
  /** Walkable platform deck (elevated). */
  platform: Rect;
  /** Concourse / unpaid lobby on the south strip of the platform. */
  concourse: Rect;
  /** Street-level entrance pad (outer north sidewalk only). */
  street: Rect;
  /** Lift cabin footprint (xz) — plaza only, south of the platform. */
  lift: Rect;
  /** Elevated walk from platform lip to lift north door (not inside the station hall). */
  apron: Rect;
  /** Shaft wall masses (block walk; cabin interior stays clear). */
  serviceBoxes: Rect[];
  /** Entry fare gates (must tap TnG to pass toward platform). */
  entryGate: { x: number; z: number; rotY: number };
  /** Exit gates (free). */
  exitGate: { x: number; z: number; rotY: number };
  /** Paid zone (past entry gates, includes platform). */
  paidZone: Rect;
  /** Interact radius for TnG reader. */
  tngSpot: { x: number; z: number; r: number };
  /** Opaque covers the follow-cam must clear or fade (street canopy + elevated roof). */
  covers: { rect: Rect; top: number }[];
  /** Passenger info displays (concourse + platform). */
  pids: { x: number; y: number; z: number; rotY: number }[];
  /** Station name boards (street fascia + platform ends). */
  nameBoards: NameBoard[];
  /** Platform furniture footprints (benches / bins) — static colliders. */
  furniture: Rect[];
  /** Solid fare-line panels beside the gates (gaps only at entry/exit aisles). */
  fareBarriers: Rect[];
};

const NAMES: { id: string; nameMs: string; nameEn: string }[] = [
  { id: "utara", nameMs: "Stesen Utara", nameEn: "Utara Station" },
  { id: "pusat", nameMs: "Stesen Pusat", nameEn: "Pusat Station" },
  { id: "selatan", nameMs: "Stesen Selatan", nameEn: "Selatan Station" },
];

function buildStation(index: number): LrtStation {
  const meta = NAMES[index]!;
  const s = stationS(index);
  const x = samplePath(s).x;
  const half = PLATFORM_ALONG / 2;
  const platZ0 = PLAT_EDGE_Z;
  const platZ1 = PLAT_BACK_Z;
  const platform = rect(x - half, x + half, platZ0, platZ1);
  const concourse = rect(x - half + 1.2, x + half - 1.2, platZ1 - 2.8, platZ1);
  const street = rect(x - 5.5, x + 5.5, STREET_Z0, STREET_Z1);
  // Lift in the plaza only — keep shaft clear of the platform / fare hall
  const liftZ0 = STREET_Z0 + 1.7;
  const liftZ1 = liftZ0 + 2.2;
  const lift = rect(x - 1.35, x + 1.35, liftZ0, liftZ1);
  const apron = rect(x - 1.9, x + 1.9, platZ1 - 0.05, liftZ0);
  const doorHalf = 0.72;
  const cx = x;
  // Shaft colliders — E/W tube + N/S door gaps (plaza only)
  const wallW = rect(lift.minX - 0.28, lift.minX, lift.minZ, lift.maxZ);
  const wallE = rect(lift.maxX, lift.maxX + 0.28, lift.minZ, lift.maxZ);
  const wallS_L = rect(lift.minX, cx - doorHalf, lift.maxZ, lift.maxZ + 0.22);
  const wallS_R = rect(cx + doorHalf, lift.maxX, lift.maxZ, lift.maxZ + 0.22);
  const wallN_L = rect(lift.minX, cx - doorHalf, lift.minZ - 0.22, lift.minZ);
  const wallN_R = rect(cx + doorHalf, lift.maxX, lift.minZ - 0.22, lift.minZ);
  const gateZ = concourse.minZ + 0.45;
  // Wider spacing so the mid wall is an obvious solid, not a fake third aisle
  const entryGate = { x: x - 2.35, z: gateZ, rotY: 0 };
  const exitGate = { x: x + 2.35, z: gateZ, rotY: 0 };
  const paidZone = rect(x - half, x + half, platZ0, gateZ + 0.8);
  const tngSpot = { x: entryGate.x, z: entryGate.z + 0.9, r: 1.6 };
  // Cabinet outer edge (~0.95) — leave aisle open only through each gate
  const gateCab = 0.95;
  const fareZ0 = gateZ - 0.14;
  const fareZ1 = gateZ + 0.14;
  const fareBarriers: Rect[] = [
    rect(x - half, entryGate.x - gateCab, fareZ0, fareZ1),
    rect(entryGate.x + gateCab, exitGate.x - gateCab, fareZ0, fareZ1),
    rect(exitGate.x + gateCab, x + half, fareZ0, fareZ1),
  ];
  const streetCanopy = rect(street.minX, street.maxX, street.minZ, street.maxZ);
  const elevatedRoof = rect(x - half - 0.6, x + half + 0.6, platZ0 - 0.5, platZ1 + 0.4);
  // Benches on the track-side strip — clear of fare gates, apron, and end columns
  const furnZ = platZ0 + 2.35;
  const furniture: Rect[] = [
    rect(x - 6.6, x - 4.6, furnZ - 0.25, furnZ + 0.35),
    rect(x + 4.6, x + 6.6, furnZ - 0.25, furnZ + 0.35),
    rect(x - 7.4, x - 6.9, furnZ - 0.15, furnZ + 0.25),
    rect(x + 6.9, x + 7.4, furnZ - 0.15, furnZ + 0.25),
  ];
  return {
    id: meta.id,
    index,
    s,
    x,
    nameMs: meta.nameMs,
    nameEn: meta.nameEn,
    platform,
    concourse,
    street,
    lift,
    apron,
    serviceBoxes: [wallW, wallE, wallS_L, wallS_R, wallN_L, wallN_R],
    entryGate,
    exitGate,
    paidZone,
    tngSpot,
    covers: [
      { rect: streetCanopy, top: 4.4 },
      { rect: elevatedRoof, top: PLATFORM_Y + 4.5 },
    ],
    pids: [
      { x: x + 5.2, y: PLATFORM_Y + 2.6, z: platZ1 - 1.2, rotY: 0 },
      { x: x - 5.5, y: PLATFORM_Y + 2.9, z: platZ0 + 1.35, rotY: 0 },
      { x: x + 5.5, y: PLATFORM_Y + 2.9, z: platZ0 + 1.35, rotY: 0 },
    ],
    nameBoards: [
      // One vertical fascia under the canopy south edge (facing the road) — no roof-flat duplicate
      { x, y: 3.15, z: street.maxZ + 0.12, rotY: 0, kind: "street" },
      { x: x - half + 0.35, y: PLATFORM_Y + 2.7, z: (platZ0 + platZ1) / 2, rotY: -Math.PI / 2, kind: "platform" },
      { x: x + half - 0.35, y: PLATFORM_Y + 2.7, z: (platZ0 + platZ1) / 2, rotY: Math.PI / 2, kind: "platform" },
    ],
    furniture,
    fareBarriers,
  };
}

export const STATIONS: LrtStation[] = [0, 1, 2].map(buildStation);

export function stationById(id: string) {
  return STATIONS.find((st) => st.id === id) ?? null;
}

export function inLiftCabin(x: number, z: number, st: LrtStation) {
  return inRect(x, z, st.lift);
}

/**
 * Floor height for a world xz (street 0, platform elevated).
 * Inside the lift shaft: north half ≈ deck landing, south half ≈ street
 * (ride-session overrides with cabinY while the player is riding).
 */
export function floorYAt(x: number, z: number): number {
  for (const st of STATIONS) {
    if (inLiftCabin(x, z, st)) {
      const midZ = (st.lift.minZ + st.lift.maxZ) / 2;
      return z <= midZ ? PLATFORM_Y : 0;
    }
    if (
      inRect(x, z, st.platform) ||
      inRect(x, z, st.concourse) ||
      inRect(x, z, st.paidZone) ||
      inRect(x, z, st.apron)
    ) {
      return PLATFORM_Y;
    }
    const half = PLATFORM_ALONG / 2;
    if (x >= st.x - half && x <= st.x + half && z >= TRACK_Z - 1.2 && z <= PLAT_EDGE_Z + 0.4) return PLATFORM_Y;
  }
  return 0;
}

/** Highest roof top over (x, z), or 0 if outdoors. */
export function coverTopAt(x: number, z: number): number {
  let top = 0;
  for (const st of STATIONS) {
    for (const c of st.covers) {
      if (inRect(x, z, c.rect) && c.top > top) top = c.top;
    }
  }
  return top;
}
