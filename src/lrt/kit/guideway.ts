/** Elevated guideway slab + pillars along the whole sandbox line. */

import { box, cyl, type Part } from "@/city/kit/merge";
import { GUIDE_Y, TRACK_Z } from "../plan/constants";
import { PATH_MAX_X, PATH_MIN_X } from "../plan/path";

const CONCRETE = "#9e9a8e";
const RAIL = "#4a4a52";

export function guidewayParts(): Part[] {
  const len = PATH_MAX_X - PATH_MIN_X;
  const mid = (PATH_MIN_X + PATH_MAX_X) / 2;
  const parts: Part[] = [
    box([len, 0.45, 4.2], [mid, GUIDE_Y, TRACK_Z], CONCRETE),
    // Running rails
    box([len, 0.12, 0.18], [mid, GUIDE_Y + 0.28, TRACK_Z - 0.75], RAIL),
    box([len, 0.12, 0.18], [mid, GUIDE_Y + 0.28, TRACK_Z + 0.75], RAIL),
  ];
  const step = 18;
  for (let x = PATH_MIN_X + 6; x < PATH_MAX_X; x += step) {
    parts.push(cyl(0.45, 0.55, GUIDE_Y, [x, GUIDE_Y / 2, TRACK_Z], CONCRETE, { segments: 10 }));
    parts.push(box([2.4, 0.35, 2.4], [x, 0.18, TRACK_Z], CONCRETE));
  }
  return parts;
}
