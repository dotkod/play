import { FRONT } from "../pusat-lepak/layout";

export const TAMAN_CERIA = {
  id: "taman-ceria" as const,
  name: { ms: "Taman Ceria", en: "Taman Ceria" },
  /** World-space centre of the housing strip. */
  origin: { x: 110, z: 0 },
  chunkSize: 64,
  neighbours: ["pusat-lepak"] as const,
};

/** Match Pusat shophouse setback — terrace south faces sit on this line. */
export const TAMAN_FRONT = FRONT;

export const TAMAN_BUS_STOP = { x: 100, z: 5.6 };

/** Home terrace centre (north of arterial). Depth 8 → cz = -FRONT - d/2. */
export const TAMAN_HOME = { id: "home-ceria", x: 116, z: -TAMAN_FRONT - 4 };
/** Outdoor porch sofa (beside the door, still on the verge). */
export const TAMAN_SOFA = { x: 114.35, z: -TAMAN_FRONT + 0.75 };
/** Doorstep on the five-foot way — enter Rumah Kak Yati. */
export const TAMAN_HOME_DOOR = { x: 116, z: -TAMAN_FRONT + 1.4 };
