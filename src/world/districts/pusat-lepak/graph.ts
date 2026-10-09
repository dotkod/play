import type { RoadGraph } from "../../road-graph";
import { EXTENT, ROAD_HALF } from "./layout";
import { PUSAT_LEPAK } from "./meta";

const D = PUSAT_LEPAK.id;
const lane = ROAD_HALF * 0.55; // left-hand offset from centreline

/**
 * Cross junction matching the current hard-coded city:
 * main road along X, cross road along Z, extents ±EXTENT.
 * Two directed lanes per axis (left-hand).
 */
export function buildPusatGraph(): RoadGraph {
  const nodes = {
    centre: { id: "pusat-centre", x: 0, z: 0, signal: true },
    xPos: { id: "pusat-x-pos", x: EXTENT, z: 0 },
    xNeg: { id: "pusat-x-neg", x: -EXTENT, z: 0 },
    zPos: { id: "pusat-z-pos", x: 0, z: EXTENT },
    zNeg: { id: "pusat-z-neg", x: 0, z: -EXTENT },
    // Connector stub toward Taman Ceria (east)
    connector: { id: "pusat-connector", x: EXTENT + 8, z: 0 },
  };

  const edges = {
    // Main road X: westbound (left of +x travel = +z side) and eastbound
    "pusat-x-east": {
      id: "pusat-x-east",
      from: "pusat-x-neg",
      to: "pusat-x-pos",
      points: [
        { x: -EXTENT, z: -lane },
        { x: EXTENT, z: -lane },
      ],
      halfWidth: 1.2,
      speed: 8,
      districtId: D,
    },
    "pusat-x-west": {
      id: "pusat-x-west",
      from: "pusat-x-pos",
      to: "pusat-x-neg",
      points: [
        { x: EXTENT, z: lane },
        { x: -EXTENT, z: lane },
      ],
      halfWidth: 1.2,
      speed: 8,
      districtId: D,
    },
    "pusat-z-north": {
      id: "pusat-z-north",
      from: "pusat-z-neg",
      to: "pusat-z-pos",
      points: [
        { x: lane, z: -EXTENT },
        { x: lane, z: EXTENT },
      ],
      halfWidth: 1.2,
      speed: 8,
      districtId: D,
    },
    "pusat-z-south": {
      id: "pusat-z-south",
      from: "pusat-z-pos",
      to: "pusat-z-neg",
      points: [
        { x: -lane, z: EXTENT },
        { x: -lane, z: -EXTENT },
      ],
      halfWidth: 1.2,
      speed: 8,
      districtId: D,
    },
    // Sidewalk loops (simplified centre lines on sidewalk mid)
    "pusat-walk-n": {
      id: "pusat-walk-n",
      from: "pusat-x-neg",
      to: "pusat-x-pos",
      points: [
        { x: -EXTENT, z: 4.5 },
        { x: EXTENT, z: 4.5 },
      ],
      halfWidth: 1,
      speed: 1.4,
      sidewalk: true,
      districtId: D,
    },
    "pusat-walk-s": {
      id: "pusat-walk-s",
      from: "pusat-x-pos",
      to: "pusat-x-neg",
      points: [
        { x: EXTENT, z: -4.5 },
        { x: -EXTENT, z: -4.5 },
      ],
      halfWidth: 1,
      speed: 1.4,
      sidewalk: true,
      districtId: D,
    },
    "pusat-to-connector": {
      id: "pusat-to-connector",
      from: "pusat-x-pos",
      to: "pusat-connector",
      points: [
        { x: EXTENT, z: -lane },
        { x: EXTENT + 8, z: -lane },
      ],
      halfWidth: 1.2,
      speed: 8,
      districtId: D,
    },
  };

  return { nodes, edges };
}

export const PUSAT_GRAPH = buildPusatGraph();
