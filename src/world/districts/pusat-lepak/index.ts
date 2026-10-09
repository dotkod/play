export { PUSAT_LEPAK } from "./meta";
export { PUSAT_GRAPH, buildPusatGraph } from "./graph";
export * from "./layout";

/** Lazy district scene entry (Task 5 wires the real scene). */
export async function load() {
  const { PusatScene } = await import("./scene");
  return { Scene: PusatScene };
}
