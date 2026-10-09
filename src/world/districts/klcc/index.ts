export { KLCC, KLCC_BUS_STOP, KLCC_FOUNTAIN, TOWER_L, TOWER_R } from "./meta";
export { KLCC_GRAPH, buildKlccGraph } from "./graph";
export { klccChunks } from "./layout";

export async function load() {
  const { KlccScene } = await import("./scene");
  return { Scene: KlccScene };
}
