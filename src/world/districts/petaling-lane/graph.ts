import type { RoadGraph } from "../../road-graph";
import { PETALING_LANE } from "./meta";

/** Mirrors walk-spine Petaling N–S + spur (spine is the live path/traffic source). */
export const PETALING_GRAPH: RoadGraph = {
  nodes: {
    "pl-j": { id: "pl-j", x: 0, z: -28 },
    "pl-mid": { id: "pl-mid", x: 28, z: -28 },
    "pl-n": { id: "pl-n", x: 28, z: -16 },
    "pl-s": { id: "pl-s", x: 28, z: -42 },
  },
  edges: {
    "pl-spur": {
      id: "pl-spur",
      from: "pl-j",
      to: "pl-mid",
      points: [
        { x: 0, z: -28 },
        { x: 28, z: -28 },
      ],
      halfWidth: 3,
      speed: 5,
      sidewalk: true,
      districtId: PETALING_LANE.id,
    },
    "pl-north": {
      id: "pl-north",
      from: "pl-mid",
      to: "pl-n",
      points: [
        { x: 28, z: -28 },
        { x: 28, z: -16 },
      ],
      halfWidth: 3,
      speed: 4,
      sidewalk: true,
      districtId: PETALING_LANE.id,
    },
    "pl-south": {
      id: "pl-south",
      from: "pl-mid",
      to: "pl-s",
      points: [
        { x: 28, z: -28 },
        { x: 28, z: -42 },
      ],
      halfWidth: 3,
      speed: 4,
      sidewalk: true,
      districtId: PETALING_LANE.id,
    },
  },
};
