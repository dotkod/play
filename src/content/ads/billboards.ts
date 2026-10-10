/**
 * Roadside / park-edge billboard ads — joke slots + one sponsor placeholder.
 * On grass only, far from every building footprint (never on the shop sidewalk).
 * Clearance is enforced by `pnpm check:layout` (src/world/layout.test.ts).
 */

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
  // SE grass (east of the Bintik spur, south of the road)
  { id: "grass-se", x: 64, z: 10, rotY: (Math.PI * 3) / 4 },
  // SW grass (west of Gunting, south of the road)
  { id: "grass-sw", x: -55, z: 22, rotY: Math.PI / 4 },
];
