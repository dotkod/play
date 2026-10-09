"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

export const perfSnapshot = { text: "fps —\ncalls —\ntris —", fps: 60 };

function perfEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("perf");
  } catch {
    return false;
  }
}

/** DOM overlay; only mounts when `?perf=1`. */
export function PerfOverlay() {
  const [on] = useState(perfEnabled);
  const [text, setText] = useState(perfSnapshot.text);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setText(perfSnapshot.text), 400);
    return () => clearInterval(id);
  }, [on]);
  if (!on) return null;
  return (
    <div className="pointer-events-none absolute top-2 right-2 z-50 rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] leading-snug whitespace-pre text-lime-300">
      {text}
    </div>
  );
}

/** Call from inside Canvas. */
export function PerfProbe() {
  const { gl } = useThree();
  const fps = useRef(60);
  useFrame((_, dt) => {
    fps.current = fps.current * 0.9 + (dt > 0 ? 1 / dt : 0) * 0.1;
    const info = gl.info.render;
    perfSnapshot.fps = fps.current;
    perfSnapshot.text = `fps ${fps.current.toFixed(0)}\ncalls ${info.calls}\ntris ${info.triangles}\ngeoms ${gl.info.memory.geometries}\ntex ${gl.info.memory.textures}`;
  });
  return null;
}
