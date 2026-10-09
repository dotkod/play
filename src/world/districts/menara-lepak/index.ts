export { MENARA_LEPAK, MENARA_BUS_STOP, TOWER_POS } from "./meta";
export { MENARA_GRAPH, buildMenaraGraph } from "./graph";
export { menaraChunks } from "./layout";

export async function load() {
  const { MenaraScene } = await import("./scene");
  return { Scene: MenaraScene };
}
