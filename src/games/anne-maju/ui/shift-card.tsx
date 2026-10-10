"use client";

/**
 * The card you see when you walk into Anne Maju: start a shift, today's shift, Anne's outfit,
 * the leaderboard and how to play. It floats over the live restaurant; walking out closes it.
 */

import { useState } from "react";
import { useAuth } from "@/core/auth-client";
import { useBestScore } from "@/shared/use-best-score";
import { useLang, useT } from "../i18n";
import { LeaderboardPanel, useBoard } from "../leaderboard-panel";
import { GAME } from "../meta";
import { nextUnlock } from "../progress";
import { rankFor, rm } from "../result";
import { OutfitPicker, Version } from "./bits";
import { Btn, Card, Tabs } from "./kit";

type Tab = "shift" | "board" | "howto";

export function ShiftCard({
  challenge,
  careerSen,
  outfitId,
  onOutfit,
  onStart,
  onDaily,
}: {
  challenge?: number;
  careerSen: number;
  outfitId: string;
  onOutfit: (id: string) => void;
  onStart: () => void;
  onDaily: () => void;
}) {
  const tr = useT();
  const lang = useLang();
  const auth = useAuth();
  const { best } = useBestScore(GAME.storageKey);
  const { board } = useBoard();
  const [tab, setTab] = useState<Tab>("shift");
  const upcoming = nextUnlock(careerSen);

  return (
    <div className="safe-px pointer-events-none absolute inset-y-0 left-0 flex items-center">
      <Card className="pointer-events-auto my-auto flex max-h-[calc(100dvh-24px)] w-[min(340px,46vw)] min-w-[260px] animate-pop flex-col gap-2.5 overflow-y-auto p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-chili text-2xl">🍵</span>
          <div className="min-w-0">
            <p className="text-xl leading-none font-extrabold">{GAME.name}</p>
            <p className="truncate text-[11px] font-bold text-ink/55">{tr.restaurant}</p>
          </div>
        </div>

        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "shift", label: tr.tabShift },
            { id: "board", label: tr.tabBoard },
            { id: "howto", label: tr.tabHowTo },
          ]}
        />

        {tab === "shift" && (
          <>
            {challenge !== undefined && (
              <p className="rounded-2xl bg-chili px-3 py-1.5 text-sm font-bold text-white">{tr.challenge(rm(challenge), rankFor(challenge, lang).title)}</p>
            )}
            <p className="text-sm leading-snug font-semibold text-ink/75">{tr.tagline}</p>
            <div className="flex gap-2">
              <Btn tone="amber" size="lg" onClick={onStart} className="flex-1">
                {tr.start}
              </Btn>
              <Btn tone="cream" size="sm" onClick={onDaily} title={tr.dailySub}>
                {tr.dailyStart}
              </Btn>
            </div>
            <OutfitPicker careerSen={careerSen} outfitId={outfitId} onOutfit={onOutfit} light />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold text-ink/60">
              {best > 0 && (
                <span>
                  {tr.yourBest} {rm(best)}
                </span>
              )}
              {upcoming && <span>🔒 {tr.nextUnlock(rm(upcoming.at - careerSen), tr.unlockNames[upcoming.key])}</span>}
            </div>
          </>
        )}

        {tab === "board" && <LeaderboardPanel board={board} highlight={auth.username ?? undefined} compact light />}

        {tab === "howto" && (
          <ul className="space-y-1 text-xs leading-snug font-semibold text-ink/80">
            {tr.howToItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>📝 {tr.slipHint}</li>
          </ul>
        )}

        <div className="flex items-center justify-between border-t-2 border-ink/10 pt-1.5 text-[11px] font-bold text-ink/45">
          <span>🚶 {tr.walkOutHint}</span>
          <Version />
        </div>
      </Card>
    </div>
  );
}
