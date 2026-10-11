/**
 * Three sandbox stations on the elevated Kelana parody line.
 * Each station is derived from its path position — no hand-typed one-offs in components.
 */

import { PLAT_BACK_Z, PLAT_EDGE_Z, PLATFORM_ALONG, PLATFORM_Y, TRACK_Z } from "./constants";
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
  /** Concourse between stairs and gates. */
  concourse: Rect;
  /** Street-level entrance pad. */
  street: Rect;
  /** Stairs footprint (projected on xz; player y lerps while inside). */
  stairs: Rect;
  /** Lift / escalator masses (block walk). */
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
  // Compact stack so plazas sit on the north road/sidewalk belt in Pusat
  const concourse = rect(x - half + 1.5, x + half - 1.5, platZ1, platZ1 + 4.5);
  const stairs = rect(x - 2.4, x + 2.4, platZ1 + 4.5, platZ1 + 9.5);
  // Plaza overlaps the north sidewalk for access; solid cores stay on the stairs
  const street = rect(x - 7, x + 7, platZ1 + 9.5, platZ1 + 15);
  // Lift / escalator tucked on the stair run (north of block lots)
  const lift = rect(x - 4.8, x - 2.8, stairs.minZ + 0.3, stairs.maxZ - 1.2);
  const escalator = rect(x + 2.8, x + 4.8, stairs.minZ + 0.3, stairs.maxZ - 1.2);
  // Gates on the north edge of concourse (toward platform)
  const gateZ = platZ1 + 0.5;
  const entryGate = { x: x - 1.4, z: gateZ, rotY: 0 };
  const exitGate = { x: x + 1.4, z: gateZ, rotY: 0 };
  const paidZone = rect(x - half, x + half, platZ0, gateZ + 0.8);
  const tngSpot = { x: entryGate.x, z: entryGate.z + 0.9, r: 1.6 };
  const streetCanopy = rect(street.minX, street.maxX, street.minZ, street.maxZ);
  const elevatedRoof = rect(x - half - 0.6, x + half + 0.6, platZ0 - 0.5, concourse.maxZ + 0.5);
  // Benches / bins on south half of deck — clear of track edge (~1.2 m) and door bay
  const furnZ = platZ1 - 1.15;
  const furniture: Rect[] = [
    rect(x - half + 2.2, x - half + 4.4, furnZ - 0.25, furnZ + 0.35),
    rect(x + half - 4.4, x + half - 2.2, furnZ - 0.25, furnZ + 0.35),
    rect(x - half + 5.0, x - half + 5.5, furnZ - 0.15, furnZ + 0.25),
    rect(x + half - 5.5, x + half - 5.0, furnZ - 0.15, furnZ + 0.25),
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
    stairs,
    serviceBoxes: [lift, escalator],
    entryGate,
    exitGate,
    paidZone,
    tngSpot,
    covers: [
      { rect: streetCanopy, top: 4.4 },
      { rect: elevatedRoof, top: PLATFORM_Y + 4.5 },
    ],
    pids: [
      { x: x + 5.2, y: PLATFORM_Y + 2.6, z: platZ1 + 3.2, rotY: 0 },
      { x: x - 5.5, y: PLATFORM_Y + 2.9, z: platZ0 + 1.35, rotY: 0 },
      { x: x + 5.5, y: PLATFORM_Y + 2.9, z: platZ0 + 1.35, rotY: 0 },
    ],
    nameBoards: [
      // Tilted street fascia south of the canopy slab (no kit red beam in front)
      { x, y: 2.85, z: street.maxZ - 0.35, rotY: 0, rotX: -0.85, kind: "street" },
      // Flat canopy sign sitting on top of the roof slab
      {
        x,
        y: 4.45,
        z: (street.minZ + street.maxZ) / 2 + 0.8,
        rotY: 0,
        rotX: -Math.PI / 2,
        kind: "canopy",
      },
      // Platform end boards facing the aisle (west faces +x, east faces -x)
      { x: x - half + 0.35, y: PLATFORM_Y + 2.7, z: (platZ0 + platZ1) / 2, rotY: -Math.PI / 2, kind: "platform" },
      { x: x + half - 0.35, y: PLATFORM_Y + 2.7, z: (platZ0 + platZ1) / 2, rotY: Math.PI / 2, kind: "platform" },
    ],
    furniture,
  };
}

export const STATIONS: LrtStation[] = [0, 1, 2].map(buildStation);

export function stationById(id: string) {
  return STATIONS.find((st) => st.id === id) ?? null;
}

/** Floor height for a world xz (street 0, stairs ramp, platform/concourse elevated). */
export function floorYAt(x: number, z: number): number {
  for (const st of STATIONS) {
    if (inRect(x, z, st.platform) || inRect(x, z, st.concourse) || inRect(x, z, st.paidZone)) return PLATFORM_Y;
    // Boarding apron over the guideway at this stop — never drop to y=0 between train and platform
    const half = PLATFORM_ALONG / 2;
    if (x >= st.x - half && x <= st.x + half && z >= TRACK_Z - 1.2 && z <= PLAT_EDGE_Z + 0.4) return PLATFORM_Y;
    if (inRect(x, z, st.stairs)) {
      const t = (st.stairs.maxZ - z) / (st.stairs.maxZ - st.stairs.minZ);
      return PLATFORM_Y * Math.min(1, Math.max(0, t));
    }
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
