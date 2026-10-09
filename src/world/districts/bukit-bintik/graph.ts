import type { RoadGraph } from "../../road-graph";
import { BUKIT_BINTIK } from "./meta";

export const BINTIK_GRAPH: RoadGraph = {
  nodes: { "bb-s": { id: "bb-s", x: 48, z: 8 }, "bb-n": { id: "bb-n", x: 50, z: 30 } },
  edges: {
    "bb-strip": {
      id: "bb-strip",
      from: "bb-s",
      to: "bb-n",
      points: [
        { x: 48, z: 8 },
        { x: 50, z: 30 },
      ],
      halfWidth: 1,
      speed: 5,
      districtId: BUKIT_BINTIK.id,
    },
  },
};
