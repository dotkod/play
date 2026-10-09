import type { RoadGraph } from "../../road-graph";
import { SENTRAL_LEPAK } from "./meta";

export const SENTRAL_GRAPH: RoadGraph = {
  nodes: { "sl-e": { id: "sl-e", x: -20, z: -40 }, "sl-c": { id: "sl-c", x: -40, z: -48 } },
  edges: {
    "sl-approach": {
      id: "sl-approach",
      from: "sl-e",
      to: "sl-c",
      points: [
        { x: -20, z: -40 },
        { x: -40, z: -48 },
      ],
      halfWidth: 1.2,
      speed: 7,
      districtId: SENTRAL_LEPAK.id,
    },
  },
};
