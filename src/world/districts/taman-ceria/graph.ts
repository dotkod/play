import type { RoadGraph } from "../../road-graph";
import { ROAD_HALF } from "../pusat-lepak/layout";
import { TAMAN_CERIA } from "./meta";

const D = TAMAN_CERIA.id;
const lane = ROAD_HALF * 0.55;

export function buildTamanGraph(): RoadGraph {
  return {
    nodes: {
      "taman-west": { id: "taman-west", x: 70, z: 0 },
      "taman-centre": { id: "taman-centre", x: 110, z: 0, signal: false },
      "taman-east": { id: "taman-east", x: 140, z: 0 },
    },
    edges: {
      "connector-pusat-taman": {
        id: "connector-pusat-taman",
        from: "pusat-connector",
        to: "taman-west",
        points: [
          { x: 50, z: -lane },
          { x: 70, z: -lane },
        ],
        halfWidth: 1.2,
        speed: 8,
        districtId: D,
      },
      "taman-x-east": {
        id: "taman-x-east",
        from: "taman-west",
        to: "taman-east",
        points: [
          { x: 70, z: -lane },
          { x: 140, z: -lane },
        ],
        halfWidth: 1.2,
        speed: 7,
        districtId: D,
      },
      "taman-x-west": {
        id: "taman-x-west",
        from: "taman-east",
        to: "taman-west",
        points: [
          { x: 140, z: lane },
          { x: 70, z: lane },
        ],
        halfWidth: 1.2,
        speed: 7,
        districtId: D,
      },
      "taman-walk-n": {
        id: "taman-walk-n",
        from: "taman-west",
        to: "taman-east",
        points: [
          { x: 70, z: 4.5 },
          { x: 140, z: 4.5 },
        ],
        halfWidth: 1,
        speed: 1.4,
        sidewalk: true,
        districtId: D,
      },
    },
  };
}

export const TAMAN_GRAPH = buildTamanGraph();
