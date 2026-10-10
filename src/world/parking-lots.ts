/** City parking lots — flush to arterials, with driveway centreline for roads + traffic. */

export type ParkingStall = { dx: number; dz: number; rotY: number; color: string };

export type ParkingLot = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Which edge faces the public road (driveway mouth). */
  entrance: "n" | "s" | "e" | "w";
  /** Driveway centreline from road into the lot (world metres). */
  drive: { axis: "x" | "z"; x0: number; z0: number; x1: number; z1: number };
  stalls: ParkingStall[];
};

const COLORS = ["#d8352a", "#2f6fd6", "#f2f2ee", "#1f1f24", "#f2b33d", "#2f8f86", "#7a4a2e", "#c7b2e6"];

function gridStalls(
  cols: number,
  rows: number,
  gapX: number,
  gapZ: number,
  rotY: number,
  seed: number,
): ParkingStall[] {
  const out: ParkingStall[] = [];
  // Inset so car length (~3.4) / width (~1.7) stays inside the bay lines
  const ox = -((cols - 1) * gapX) / 2;
  const oz = -((rows - 1) * gapZ) / 2;
  let n = seed;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      n = (n * 1103515245 + 12345) >>> 0;
      // Leave ~30% empty so arriving cars have a bay
      if (n % 10 < 3) continue;
      out.push({
        dx: ox + c * gapX,
        dz: oz + r * gapZ,
        rotY,
        color: COLORS[n % COLORS.length],
      });
    }
  }
  return out;
}

/**
 * Lots sit against an arterial; `drive` is a short stub the spine merges into ROAD_STRIPS
 * so the map shows a connected entrance and cars can peel in.
 */
export const PARKING_LOTS: ParkingLot[] = [
  // West of Pusat, north of the main E–W road (beside Kopitiam / Mega Mall block)
  {
    id: "park-mega",
    x: -48,
    z: -11,
    w: 14,
    d: 8,
    entrance: "s",
    drive: { axis: "z", x0: -48, z0: -6.5, x1: -48, z1: 0 },
    stalls: gridStalls(4, 2, 3.2, 3.6, 0, 7),
  },
  // East of Petaling T-junction — clear of spur walk band (|z+28|≲6) and N–S street (|x-28|≲6)
  {
    id: "park-petaling",
    x: 44.2,
    z: -12,
    w: 11,
    d: 8,
    entrance: "n",
    drive: { axis: "z", x0: 44.2, z0: -28, x1: 44.2, z1: -8 },
    stalls: gridStalls(3, 2, 3.2, 3.5, 0, 11),
  },
  // East of stadium approach, clear of the L-junction and bowl
  {
    id: "park-stadium",
    x: 36,
    z: 76,
    w: 12,
    d: 10,
    entrance: "w",
    drive: { axis: "x", x0: 22, z0: 76, x1: 30, z1: 76 },
    stalls: gridStalls(3, 2, 3.4, 4.0, Math.PI / 2, 19),
  },
  // West of Pasar arterial — clear of halls and carriageway
  {
    id: "park-pasar",
    x: -22,
    z: 48,
    w: 12,
    d: 10,
    entrance: "e",
    drive: { axis: "x", x0: -6, z0: 48, x1: -16, z1: 48 },
    stalls: gridStalls(3, 2, 3.4, 4.0, Math.PI / 2, 23),
  },
];

/** Drive endpoint on the public road (farther from lot centre). */
export function parkingEntrance(lot: ParkingLot) {
  const { drive } = lot;
  if (drive.axis === "z") {
    const z = Math.abs(drive.z0 - lot.z) >= Math.abs(drive.z1 - lot.z) ? drive.z0 : drive.z1;
    return { x: drive.x0, z };
  }
  const x = Math.abs(drive.x0 - lot.x) >= Math.abs(drive.x1 - lot.x) ? drive.x0 : drive.x1;
  return { x, z: drive.z0 };
}

/** Drive endpoint at the lot apron (nearer lot centre). */
export function parkingApron(lot: ParkingLot) {
  const { drive } = lot;
  if (drive.axis === "z") {
    const z = Math.abs(drive.z0 - lot.z) < Math.abs(drive.z1 - lot.z) ? drive.z0 : drive.z1;
    return { x: drive.x0, z };
  }
  const x = Math.abs(drive.x0 - lot.x) < Math.abs(drive.x1 - lot.x) ? drive.x0 : drive.x1;
  return { x, z: drive.z0 };
}
