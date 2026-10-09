"use client";

import { LRT_LINE } from "@/content/transit";
import type { LrtStationId } from "@/content/transit/lrt-kelana";
import { RailBoard } from "./rail-board";

/** Thin LRT wrapper kept for any callers still using the old API. */
export function LrtBoard({
  open,
  from,
  onClose,
  onPick,
}: {
  open: boolean;
  from: LrtStationId;
  onClose: () => void;
  onPick: (dest: LrtStationId) => void;
}) {
  return (
    <RailBoard
      open={open}
      line={LRT_LINE}
      from={from}
      onClose={onClose}
      onPick={(s) => onPick(s.id as LrtStationId)}
    />
  );
}
