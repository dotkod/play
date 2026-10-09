import type { RoadGraph } from "../../road-graph";
import { BUKIT_JALAN } from "./meta";

export const JALAN_GRAPH: RoadGraph = {
  nodes: { "bj-s": { id: "bj-s", x: 0, z: 42 }, "bj-n": { id: "bj-n", x: 12, z: 70 } },
  edges: {
    "bj-road": {
      id: "bj-road",
      from: "bj-s",
      to: "bj-n",
      points: [
        { x: 0, z: 42 },
        { x: 12, z: 70 },
      ],
      halfWidth: 1.2,
      speed: 7,
      districtId: BUKIT_JALAN.id,
    },
  },
};
