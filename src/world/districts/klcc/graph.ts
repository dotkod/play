import type { RoadGraph } from "../../road-graph";
import { ROAD_HALF } from "../pusat-lepak/layout";
import { KLCC } from "./meta";

const D = KLCC.id;
const lane = ROAD_HALF * 0.55;

export function buildKlccGraph(): RoadGraph {
  return {
    nodes: {
      "klcc-south": { id: "klcc-south", x: 0, z: -55 },
      "klcc-centre": { id: "klcc-centre", x: 0, z: -90 },
      "klcc-north": { id: "klcc-north", x: 0, z: -120 },
    },
    edges: {
      "connector-pusat-klcc": {
        id: "connector-pusat-klcc",
        from: "pusat-z-neg",
        to: "klcc-south",
        points: [
          { x: lane, z: -42 },
          { x: lane, z: -55 },
        ],
        halfWidth: 1.2,
        speed: 8,
        districtId: D,
      },
      "klcc-z-north": {
        id: "klcc-z-north",
        from: "klcc-south",
        to: "klcc-north",
        points: [
          { x: lane, z: -55 },
          { x: lane, z: -120 },
        ],
        halfWidth: 1.2,
        speed: 7,
        districtId: D,
      },
      "klcc-z-south": {
        id: "klcc-z-south",
        from: "klcc-north",
        to: "klcc-south",
        points: [
          { x: -lane, z: -120 },
          { x: -lane, z: -55 },
        ],
        halfWidth: 1.2,
        speed: 7,
        districtId: D,
      },
    },
  };
}

export const KLCC_GRAPH = buildKlccGraph();
