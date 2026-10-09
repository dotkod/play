export type GameEvent =
  | { type: "jobFinished"; job: string; earned: number; served: number; mode: string }
  | { type: "catPetted"; id: string }
  | { type: "entered"; place: string }
  | { type: "talked"; npc: string; dialogue?: string }
  | { type: "bought"; item: string; at?: string }
  | { type: "gave"; item: string; npc: string }
  | { type: "tookBus"; to: string }
  | { type: "tookLrt"; to: string }
  | { type: "tookMrt"; to: string }
  | { type: "tookMonorel"; to: string }
  | { type: "tookTaxi"; to: string }
  | { type: "sat"; place: string };

type Handler = (event: GameEvent) => void;

const listeners = new Set<Handler>();

export function on(handler: Handler) {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

export function emit(event: GameEvent) {
  listeners.forEach((handler) => handler(event));
}
