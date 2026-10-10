import { expect, it } from "vitest";
import { LANES } from "../plan";
it("left-hand traffic: east-bound lanes north of centre (-z), west-bound south (+z)", () => {
  const bad = LANES.filter((l) => {
    const cz = l.from.z;
    const cx = l.from.x;
    if (l.dir.x === 1) return !(l.start.z < cz);
    if (l.dir.x === -1) return !(l.start.z > cz);
    if (l.dir.z === 1) return !(l.start.x > cx); // south-bound: left is east (+x)
    return !(l.start.x < cx); // north-bound: left is west (-x)
  });
  expect(bad.map((l) => l.id)).toEqual([]);
});
