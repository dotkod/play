"use client";

import { useEffect, useState } from "react";
import { dialogueById } from "@/content/dialogue";
import { npcById } from "@/content/npcs";
import type { Choice, Effect } from "@/core/dialogue/types";
import { emit } from "@/core/events";
import { addItem, addReputation, setFlag } from "@/core/profile";
import { acceptTask } from "@/core/tasks/engine";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";

function runEffects(effects?: Effect[]) {
  if (!effects) return;
  for (const e of effects) {
    if (e.type === "setFlag") setFlag(e.id, e.value);
    if (e.type === "addReputation") addReputation(e.npc, e.delta);
    if (e.type === "giveItem") addItem(e.item, e.count ?? 1);
    if (e.type === "offerTask") acceptTask(e.taskId);
  }
}

export function DialogueBox({
  dialogueId,
  npcId,
  onClose,
}: {
  dialogueId: string;
  npcId: string;
  onClose: () => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const dialogue = dialogueById(dialogueId);
  const npc = npcById(npcId);
  const [nodeId, setNodeId] = useState(dialogue?.start ?? "");
  const [lineIdx, setLineIdx] = useState(0);

  const node = dialogue?.nodes[nodeId];

  useEffect(() => {
    if (!dialogue || !npc || !node) onClose();
  }, [dialogue, npc, node, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
        e.preventDefault();
        document.getElementById("dialogue-advance")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!dialogue || !npc || !node) return null;

  const line = node.lines[lineIdx];
  const atEndOfLines = lineIdx >= node.lines.length - 1;
  const hasChoices = Boolean(node.choices?.length);
  const showChoices = atEndOfLines && hasChoices;
  const speaker =
    line?.speaker === "player"
      ? lang === "ms"
        ? "Kau"
        : "You"
      : (npcById(line?.speaker ?? npcId)?.name[lang] ?? line?.speaker);

  const finishNode = (choice?: Choice) => {
    runEffects(node.effects);
    runEffects(choice?.effects);
    const next = choice?.next ?? node.next;
    if (!next) {
      emit({ type: "talked", npc: npcId, dialogue: dialogueId });
      onClose();
      return;
    }
    const nextNode = dialogue.nodes[next];
    if (!nextNode) {
      emit({ type: "talked", npc: npcId, dialogue: dialogueId });
      onClose();
      return;
    }
    setNodeId(next);
    setLineIdx(0);
  };

  const advance = () => {
    if (!atEndOfLines) {
      setLineIdx((i) => i + 1);
      return;
    }
    if (hasChoices) return;
    finishNode();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 safe-px pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto mb-3 max-w-xl rounded-2xl border-4 border-ink bg-cream/95 p-4 text-ink shadow-[0_6px_0_#1f1a17]">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-extrabold tracking-wide text-chili uppercase">{speaker}</p>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-0.5 text-[11px] font-extrabold text-ink/45 active:bg-ink/10">
            {tr.close}
          </button>
        </div>

        <button id="dialogue-advance" type="button" className="mt-1 w-full text-left text-base leading-snug font-bold" onClick={advance}>
          {line ? line.text[lang] : ""}
        </button>

        {showChoices ? (
          <div className="mt-3 flex flex-col gap-2">
            {node.choices!.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => finishNode(c)}
                className="rounded-xl border-2 border-ink bg-amber-300 px-3 py-2.5 text-left text-sm font-extrabold active:translate-y-0.5"
              >
                {i + 1}. {c.text[lang]}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={advance}
            className="mt-3 w-full rounded-xl border-2 border-ink bg-amber-300 px-3 py-2.5 text-sm font-extrabold active:translate-y-0.5"
          >
            {tr.tapContinue}
          </button>
        )}
      </div>
    </div>
  );
}
