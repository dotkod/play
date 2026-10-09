import type { RoadGraph } from "../../road-graph";
import { PASAR_BESAR } from "./meta";

export const PASAR_GRAPH: RoadGraph = {
  nodes: { "pb-s": { id: "pb-s", x: 0, z: 42 }, "pb-c": { id: "pb-c", x: 0, z: 58 } },
  edges: {
    "pb-road": {
      id: "pb-road",
      from: "pb-s",
      to: "pb-c",
      points: [
        { x: 0, z: 42 },
        { x: 0, z: 58 },
      ],
      halfWidth: 1.2,
      speed: 6,
      districtId: PASAR_BESAR.id,
    },
  },
};
