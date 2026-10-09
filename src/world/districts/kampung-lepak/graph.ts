import type { RoadGraph } from "../../road-graph";
import { KAMPUNG_LEPAK } from "./meta";

export const KAMPUNG_GRAPH: RoadGraph = {
  nodes: { "kg-s": { id: "kg-s", x: -50, z: 20 }, "kg-c": { id: "kg-c", x: -62, z: 48 } },
  edges: {
    "kg-lane": {
      id: "kg-lane",
      from: "kg-s",
      to: "kg-c",
      points: [
        { x: -50, z: 20 },
        { x: -62, z: 48 },
      ],
      halfWidth: 1,
      speed: 5,
      districtId: KAMPUNG_LEPAK.id,
    },
  },
};
