"use client";

import { useRef, useState } from "react";
import { input } from "../controls";

// Thumb stick for touch screens, bottom-left
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const R = 46;

  const move = (e: React.PointerEvent) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    input.joy.x = dx / R;
    input.joy.y = -dy / R;
    input.target = null;
  };
  const end = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    input.joy.x = 0;
    input.joy.y = 0;
  };

  return (
    <div
      ref={base}
      className="edge-bl absolute mb-12 ml-3 size-32 touch-none rounded-full border-4 border-ink/40 bg-ink/25 backdrop-blur-sm"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => pointer.current === e.pointerId && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute top-1/2 left-1/2 size-14 rounded-full border-4 border-ink bg-amber-300 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

/** Horizontal look pad — camera yaw only (right thumb). No auto camera. */
export function LookPad() {
  const base = useRef<HTMLDivElement>(null);
  const [knobX, setKnobX] = useState(0);
  const pointer = useRef<number | null>(null);
  const R = 40;

  const move = (e: React.PointerEvent) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    if (Math.abs(dx) > R) dx = Math.sign(dx) * R;
    setKnobX(dx);
    input.look = dx / R;
  };
  const end = () => {
    pointer.current = null;
    setKnobX(0);
    input.look = 0;
  };

  return (
    <div
      ref={base}
      aria-label="Look"
      className="edge-br absolute mb-12 mr-3 flex h-20 w-28 touch-none items-center justify-center rounded-full border-4 border-ink/40 bg-ink/25 backdrop-blur-sm"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => pointer.current === e.pointerId && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="size-11 rounded-full border-4 border-ink bg-sky-300 shadow-lg"
        style={{ transform: `translateX(${knobX}px)` }}
      />
    </div>
  );
}
