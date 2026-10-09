import type { RoadGraph } from "../../road-graph";
import { ROAD_HALF } from "../pusat-lepak/layout";
import { MENARA_LEPAK } from "./meta";

const D = MENARA_LEPAK.id;
const lane = ROAD_HALF * 0.55;

export function buildMenaraGraph(): RoadGraph {
  return {
    nodes: {
      "menara-east": { id: "menara-east", x: -50, z: 0 },
      "menara-centre": { id: "menara-centre", x: -80, z: 0 },
      "menara-west": { id: "menara-west", x: -105, z: 0 },
    },
    edges: {
      "connector-pusat-menara": {
        id: "connector-pusat-menara",
        from: "pusat-x-neg",
        to: "menara-east",
        points: [
          { x: -42, z: -lane },
          { x: -50, z: -lane },
        ],
        halfWidth: 1.2,
        speed: 8,
        districtId: D,
      },
      "menara-x-west": {
        id: "menara-x-west",
        from: "menara-east",
        to: "menara-west",
        points: [
          { x: -50, z: -lane },
          { x: -105, z: -lane },
        ],
        halfWidth: 1.2,
        speed: 7,
        districtId: D,
      },
      "menara-x-east": {
        id: "menara-x-east",
        from: "menara-west",
        to: "menara-east",
        points: [
          { x: -105, z: lane },
          { x: -50, z: lane },
        ],
        halfWidth: 1.2,
        speed: 7,
        districtId: D,
      },
    },
  };
}

export const MENARA_GRAPH = buildMenaraGraph();
