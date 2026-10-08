"use client";

import { type RefObject, useEffect, useState } from "react";

// Next keeps previously visited routes mounted (hidden) for instant back-navigation.
// Pause a canvas's render loop whenever its container has no size, so hidden scenes cost nothing.
export function useVisibleFrameloop(ref: RefObject<HTMLElement | null>) {
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrameloop(width > 0 && height > 0 ? "always" : "never");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return frameloop;
}
