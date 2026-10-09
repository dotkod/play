/**
 * Roadside / park-edge billboard ads — joke slots + one sponsor placeholder.
 * On grass only, far from every building footprint (never on the shop sidewalk).
 */

import { BUILDINGS, footprint } from "@/world/districts/pusat-lepak/layout";
import { PETALING_SHOPS, petalingFootprint } from "@/world/districts/petaling-lane/buildings";
import { PARKING_LOTS } from "@/world/parking-lots";

export type BillboardAd = {
  id: string;
  text: string;
  sub?: string;
  kind: "joke" | "sponsor";
  bg: string;
  fg: string;
};

export const BILLBOARD_ADS: BillboardAd[] = [
  { id: "anne", text: "ANNE MAJU", sub: "TEH TARIK 24 JAM", kind: "joke", bg: "#c62f25", fg: "#f6d13a" },
  { id: "rapid", text: "RAPIDLEPAK", sub: "NAIK JE LA", kind: "joke", bg: "#1f5fa8", fg: "#ffffff" },
  { id: "mega", text: "MEGA MALL", sub: "AC KUAT GILA", kind: "joke", bg: "#6b5b95", fg: "#f4efe4" },
  { id: "oyen", text: "USAP OYEN", sub: "HATI TENANG", kind: "joke", bg: "#f28c28", fg: "#1f1a17" },
  { id: "lepak", text: "KUALA LEPAK", sub: "JANGAN STRESS", kind: "joke", bg: "#2f8f86", fg: "#fbf3e4" },
  { id: "sponsor", text: "YOUR AD HERE", sub: "kl.dotkod.com", kind: "sponsor", bg: "#1f1a17", fg: "#fbf3e4" },
];

export const BILLBOARD_AD_SECONDS = 45;

/** Match mesh in hub/billboards.tsx — keep in sync. */
export const BILLBOARD_PANEL_W = 4.2;
export const BILLBOARD_PANEL_T = 0.55;

/** Extra metres clear of buildings / lots. */
const CLEAR_PAD = 4.5;

export type BillboardSpot = { id: string; x: number; z: number; rotY: number };

/**
 * Open grass pockets around Pusat — readable from the arterials, not touching shops.
 * rotY aims the face toward the main roads so you see the ad while walking.
 */
export const BILLBOARD_SPOTS: BillboardSpot[] = [
  // NE grass (east of Klinik row, north of the E–W road)
  { id: "grass-ne", x: 55, z: -22, rotY: (-Math.PI * 3) / 4 },
  // NW grass (west of Mega Mall block, north of the road)
  { id: "grass-nw", x: -58, z: -26, rotY: (-Math.PI) / 4 },
  // SE grass (east of Dobi/Surau, south of the road)
  { id: "grass-se", x: 55, z: 22, rotY: (Math.PI * 3) / 4 },
  // SW grass (west of Gunting, south of the road)
  { id: "grass-sw", x: -55, z: 22, rotY: Math.PI / 4 },
];

function boardBox(s: BillboardSpot) {
  const hw = BILLBOARD_PANEL_W / 2 + 0.4;
  const ht = BILLBOARD_PANEL_T / 2 + 0.4;
  const c = Math.cos(s.rotY);
  const sn = Math.sin(s.rotY);
  const corners = [
    { lx: -hw, lz: -ht },
    { lx: hw, lz: -ht },
    { lx: hw, lz: ht },
    { lx: -hw, lz: ht },
  ].map(({ lx, lz }) => ({
    x: s.x + lx * c + lz * sn,
    z: s.z - lx * sn + lz * c,
  }));
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minZ: Math.min(...corners.map((p) => p.z)),
    maxZ: Math.max(...corners.map((p) => p.z)),
  };
}

function padBox(b: { minX: number; maxX: number; minZ: number; maxZ: number }, pad: number) {
  return { minX: b.minX - pad, maxX: b.maxX + pad, minZ: b.minZ - pad, maxZ: b.maxZ + pad };
}

function overlaps(
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Dev guard — boards must stay on grass, clear of buildings + parking lots. */
export function assertBillboardClear() {
  const errors: string[] = [];
  for (const spot of BILLBOARD_SPOTS) {
    const box = boardBox(spot);
    for (const b of BUILDINGS) {
      const f = padBox(footprint(b), CLEAR_PAD);
      if (overlaps(box, f)) errors.push(`${spot.id} too close to Pusat building ${b.id}`);
    }
    for (const s of PETALING_SHOPS) {
      const f = padBox(petalingFootprint(s), CLEAR_PAD);
      if (overlaps(box, f)) errors.push(`${spot.id} too close to Petaling shop ${s.id}`);
    }
    for (const lot of PARKING_LOTS) {
      const f = padBox(
        { minX: lot.x - lot.w / 2, maxX: lot.x + lot.w / 2, minZ: lot.z - lot.d / 2, maxZ: lot.z + lot.d / 2 },
        CLEAR_PAD,
      );
      if (overlaps(box, f)) errors.push(`${spot.id} too close to parking ${lot.id}`);
    }
  }
  return errors;
}

if (process.env.NODE_ENV !== "production") {
  for (const e of assertBillboardClear()) console.error(`[billboards] ${e}`);
}
