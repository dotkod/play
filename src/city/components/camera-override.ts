/**
 * Lets a job take the city camera (e.g. Anne Maju's serving view) without its own canvas.
 * `panel` is the screen space covered by the job's UI, so the view centres in what's left.
 */

export type CameraShot = {
  pos: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
  /** Horizontal half-extent (metres at the look point's distance) that must stay in view. */
  fitHalfWidth: number;
  fitDistance: number;
  panel: { side: "right" | "bottom"; px: number };
};

export const cityCamera = { shot: null as CameraShot | null };
