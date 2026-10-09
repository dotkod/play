/** Taxi / e-hailing drop points — unlocked by talking to Kumar at Sentral. */

export const TAXI_FARE_SEN = 350; // RM3.50 flat

export type TaxiDest = {
  id: string;
  label: { ms: string; en: string };
  x: number;
  z: number;
  rotY: number;
  district: string;
};

export const TAXI_DESTS: TaxiDest[] = [
  { id: "pusat", label: { ms: "Pusat Lepak", en: "Pusat Lepak" }, x: 0, z: 6, rotY: 0, district: "pusat-lepak" },
  { id: "klcc", label: { ms: "KLCC", en: "KLCC" }, x: 0, z: -88, rotY: 0, district: "klcc" },
  { id: "taman", label: { ms: "Taman Ceria", en: "Taman Ceria" }, x: 100, z: 4, rotY: Math.PI, district: "taman-ceria" },
  { id: "tlx", label: { ms: "TLX", en: "TLX" }, x: 62, z: -66, rotY: 0, district: "tlx" },
  { id: "menara", label: { ms: "Menara Lepak", en: "Menara Lepak" }, x: -82, z: 8, rotY: Math.PI / 2, district: "menara-lepak" },
  { id: "bintik", label: { ms: "Bukit Bintik", en: "Bukit Bintik" }, x: 48, z: 20, rotY: 0, district: "bukit-bintik" },
  { id: "jalan", label: { ms: "Bukit Jalan", en: "Bukit Jalan" }, x: 22, z: 78, rotY: 0, district: "bukit-jalan" },
  { id: "kampung", label: { ms: "Kampung Lepak", en: "Kampung Lepak" }, x: -60, z: 48, rotY: 0, district: "kampung-lepak" },
  { id: "pasar", label: { ms: "Pasar Besar", en: "Pasar Besar" }, x: -8, z: 58, rotY: Math.PI, district: "pasar-besar" },
  { id: "sentral", label: { ms: "Sentral Lepak", en: "Sentral Lepak" }, x: -40, z: -48, rotY: 0, district: "sentral-lepak" },
];

export const TAXI_UNLOCK_FLAG = "taxiUnlocked";
