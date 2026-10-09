export type Line = {
  speaker: string;
  text: { ms: string; en: string };
  mood?: "happy" | "neutral" | "annoyed" | "sad" | "excited";
};

export type Effect =
  | { type: "setFlag"; id: string; value: boolean }
  | { type: "addReputation"; npc: string; delta: number }
  | { type: "giveItem"; item: string; count?: number }
  | { type: "offerTask"; taskId: string };

export type Choice = {
  text: { ms: string; en: string };
  next?: string;
  effects?: Effect[];
};

export type Node = {
  id: string;
  lines: Line[];
  choices?: Choice[];
  next?: string;
  effects?: Effect[];
};

export type Dialogue = {
  id: string;
  start: string;
  nodes: Record<string, Node>;
};
