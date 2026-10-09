export const TLX = {
  id: "tlx" as const,
  name: { ms: "TLX", en: "TLX" },
  origin: { x: 70, z: -75 },
  chunkSize: 64,
  neighbours: ["klcc", "pusat-lepak"] as const,
};

export const MENARA_106 = { x: 72, z: -82 };
/** On the east arterial — cars stay on asphalt, not in the park. */
export const TLX_BUS_STOP = { x: 62, z: -68 };
/** North of the road so map/3D asphalt stays visible through TLX. */
export const TLX_PARK = { x: 70, z: -80, w: 18, d: 12 };
