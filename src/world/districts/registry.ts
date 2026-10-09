import { ChunkManager } from "../chunk-manager";
import { mergeGraphs, type RoadGraph } from "../road-graph";
import { BINTIK_GRAPH } from "./bukit-bintik/graph";
import { bintikChunks } from "./bukit-bintik/layout";
import { BUKIT_BINTIK } from "./bukit-bintik/meta";
import { JALAN_GRAPH } from "./bukit-jalan/graph";
import { jalanChunks } from "./bukit-jalan/layout";
import { BUKIT_JALAN } from "./bukit-jalan/meta";
import { KAMPUNG_GRAPH } from "./kampung-lepak/graph";
import { kampungChunks } from "./kampung-lepak/layout";
import { KAMPUNG_LEPAK } from "./kampung-lepak/meta";
import { KLCC_GRAPH } from "./klcc/graph";
import { klccChunks } from "./klcc/layout";
import { KLCC } from "./klcc/meta";
import { MENARA_GRAPH } from "./menara-lepak/graph";
import { menaraChunks } from "./menara-lepak/layout";
import { MENARA_LEPAK } from "./menara-lepak/meta";
import { PASAR_GRAPH } from "./pasar-besar/graph";
import { pasarChunks } from "./pasar-besar/layout";
import { PASAR_BESAR } from "./pasar-besar/meta";
import { PETALING_GRAPH } from "./petaling-lane/graph";
import { petalingChunks } from "./petaling-lane/layout";
import { PETALING_LANE } from "./petaling-lane/meta";
import { PUSAT_GRAPH } from "./pusat-lepak/graph";
import { pusatChunks } from "./pusat-lepak/layout";
import { PUSAT_LEPAK } from "./pusat-lepak/meta";
import { SENTRAL_GRAPH } from "./sentral-lepak/graph";
import { sentralChunks } from "./sentral-lepak/layout";
import { SENTRAL_LEPAK } from "./sentral-lepak/meta";
import { TAMAN_GRAPH } from "./taman-ceria/graph";
import { tamanChunks } from "./taman-ceria/layout";
import { TAMAN_CERIA } from "./taman-ceria/meta";
import { TLX_GRAPH } from "./tlx/graph";
import { tlxChunks } from "./tlx/layout";
import { TLX } from "./tlx/meta";

export type DistrictId =
  | "pusat-lepak"
  | "taman-ceria"
  | "klcc"
  | "menara-lepak"
  | "tlx"
  | "bukit-bintik"
  | "bukit-jalan"
  | "kampung-lepak"
  | "pasar-besar"
  | "petaling-lane"
  | "sentral-lepak";

export const DISTRICT_META = {
  "pusat-lepak": PUSAT_LEPAK,
  "taman-ceria": TAMAN_CERIA,
  klcc: KLCC,
  "menara-lepak": MENARA_LEPAK,
  tlx: TLX,
  "bukit-bintik": BUKIT_BINTIK,
  "bukit-jalan": BUKIT_JALAN,
  "kampung-lepak": KAMPUNG_LEPAK,
  "pasar-besar": PASAR_BESAR,
  "petaling-lane": PETALING_LANE,
  "sentral-lepak": SENTRAL_LEPAK,
};

export function worldGraph(): RoadGraph {
  return mergeGraphs(
    PUSAT_GRAPH,
    TAMAN_GRAPH,
    KLCC_GRAPH,
    MENARA_GRAPH,
    TLX_GRAPH,
    BINTIK_GRAPH,
    JALAN_GRAPH,
    KAMPUNG_GRAPH,
    PASAR_GRAPH,
    PETALING_GRAPH,
    SENTRAL_GRAPH,
  );
}

export function createWorldChunks(): ChunkManager {
  const cm = new ChunkManager({ size: PUSAT_LEPAK.chunkSize, radius: 1 });
  cm.register(pusatChunks());
  cm.register(tamanChunks());
  cm.register(klccChunks());
  cm.register(menaraChunks());
  cm.register(tlxChunks());
  cm.register(bintikChunks());
  cm.register(jalanChunks());
  cm.register(kampungChunks());
  cm.register(pasarChunks());
  cm.register(petalingChunks());
  cm.register(sentralChunks());
  return cm;
}

export function districtAt(x: number, z: number): DistrictId {
  if (x >= 70 && z > -40) return "taman-ceria";
  if (x >= 55 && z <= -55) return "tlx";
  if (x >= 35 && z >= 12) return "bukit-bintik";
  if (z >= 65) return "bukit-jalan";
  if (z >= 45 && x > -40 && x < 30) return "pasar-besar";
  if (x <= -50 && z >= 30) return "kampung-lepak";
  if (x <= -50 && z < 30) return "menara-lepak";
  if (x <= -25 && z <= -35) return "sentral-lepak";
  if (x >= 18 && x < 45 && z <= -14 && z > -45) return "petaling-lane";
  if (z <= -55) return "klcc";
  return "pusat-lepak";
}
