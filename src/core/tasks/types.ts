export type Objective =
  | { type: "goTo"; place: string }
  | { type: "talkTo"; npc: string; dialogue?: string }
  | { type: "playJob"; job: string; minEarned?: number; minServed?: number; mode?: "normal" | "daily" }
  | { type: "petCats"; count: number; catId?: string }
  | { type: "buy"; item: string; count?: number; at?: string }
  | { type: "give"; item: string; npc: string }
  | { type: "sit"; place: string };

export type TaskRewards = {
  money?: number;
  xp?: number;
  item?: string;
  outfit?: string;
  unlock?: string;
  reputation?: Record<string, number>;
};

export type Task = {
  id: string;
  title: { ms: string; en: string };
  giver: string;
  intro: { ms: string; en: string };
  objectives: Objective[];
  rewards?: TaskRewards;
  requires?: { level?: number; tasksDone?: string[]; flags?: string[] };
  repeat?: "daily" | "weekly";
  chain?: string;
};
