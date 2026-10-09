import type { RoadGraph } from "../../road-graph";
import { TLX } from "./meta";

export const TLX_GRAPH: RoadGraph = {
  nodes: {
    "tlx-w": { id: "tlx-w", x: 50, z: -70 },
    "tlx-c": { id: "tlx-c", x: 70, z: -75 },
  },
  edges: {
    "tlx-approach": {
      id: "tlx-approach",
      from: "tlx-w",
      to: "tlx-c",
      points: [
        { x: 50, z: -70 },
        { x: 70, z: -75 },
      ],
      halfWidth: 1.2,
      speed: 7,
      districtId: TLX.id,
    },
  },
};
