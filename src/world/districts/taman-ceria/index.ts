export { TAMAN_CERIA, TAMAN_BUS_STOP, TAMAN_HOME, TAMAN_HOME_DOOR, TAMAN_SOFA } from "./meta";
export { TAMAN_GRAPH, buildTamanGraph } from "./graph";
export * from "./layout";

export async function load() {
  const { TamanScene } = await import("./scene");
  return { Scene: TamanScene };
}
