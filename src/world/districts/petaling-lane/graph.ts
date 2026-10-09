import type { RoadGraph } from "../../road-graph";
import { PETALING_LANE } from "./meta";

export const PETALING_GRAPH: RoadGraph = {
  nodes: { "pl-n": { id: "pl-n", x: 28, z: -12 }, "pl-s": { id: "pl-s", x: 28, z: -36 } },
  edges: {
    "pl-lane": {
      id: "pl-lane",
      from: "pl-n",
      to: "pl-s",
      points: [
        { x: 28, z: -12 },
        { x: 28, z: -36 },
      ],
      halfWidth: 1,
      speed: 4,
      sidewalk: true,
      districtId: PETALING_LANE.id,
    },
  },
};
