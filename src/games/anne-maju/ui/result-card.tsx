"use client";

/** Shift over: what you made, where it came from, your rank, and what's next. */

import { useT } from "../i18n";
import { LeaderboardPanel } from "../leaderboard-panel";
import { nextUnlock } from "../progress";
import { rm } from "../result";
import type { GameState } from "../state";
import { Stat, titleStroke } from "./bits";
import { Btn, Card } from "./kit";
import { Overlay } from "./pause-card";
import { useShiftScore } from "./use-shift-score";

export type ShiftUnlocks = { unlocks: { key: string }[]; outfits: string[] } | null;

export function ResultCard({
  s,
  result,
  careerSen,
  onRestart,
  onClose,
}: {
  s: GameState;
  result: ShiftUnlocks;
  careerSen: number;
  onRestart: () => void;
  onClose: () => void;
}) {
  const tr = useT();
  const { rank, next, isRecord, saved, saving, error, board, username, share, shareState } = useShiftScore(s);
  const upcoming = nextUnlock(careerSen);
  const unlocked = !!result && (result.unlocks.length > 0 || result.outfits.length > 0);

  return (
    <Overlay>
      <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-3xl animate-pop flex-row items-stretch gap-3 overflow-y-auto max-[640px]:flex-col">
        <Card className="flex flex-1 flex-col items-center gap-1.5 p-4 text-center">
          <p className="text-[11px] font-extrabold tracking-widest text-ink/50 uppercase">{s.mode === "daily" ? tr.dailyBadge : tr.shiftOver}</p>
          <p className="text-4xl leading-none">{rank.emoji}</p>
          <p className="text-base font-extrabold">{rank.title}</p>
          <p className={`text-5xl leading-none font-extrabold text-amber-300 ${titleStroke}`}>{rm(s.earned)}</p>
          {isRecord && <p className="rounded-full bg-chili px-3 py-0.5 text-xs font-bold text-white">{tr.newRecord}</p>}
          <div className="mt-1 grid w-full grid-cols-3 gap-1 text-xs font-bold">
            <span className="rounded-xl bg-leaf/15 py-1">
              {tr.sales}
              <b className="block text-sm">{rm(s.sales)}</b>
            </span>
            <span className="rounded-xl bg-amber-300/40 py-1">
              {tr.tips}
              <b className="block text-sm">+{rm(s.tips)}</b>
            </span>
            <span className="rounded-xl bg-chili/15 py-1">
              {tr.wasted}
              <b className="block text-sm">-{rm(s.wasted)}</b>
            </span>
          </div>
          <div className="grid w-full grid-cols-4 gap-1.5 text-xs">
            <Stat label={tr.stats.served} value={s.served} />
            <Stat label={tr.stats.wrong} value={s.wrong} />
            <Stat label={tr.stats.walkouts} value={s.walkouts} />
            <Stat label={tr.stats.streak} value={s.bestStreak} />
          </div>
          <p className="text-xs font-bold text-ink/65">{next ? `🎯 ${tr.nextRank(rm(next.min - s.earned), next.title)}` : tr.topRank}</p>
        </Card>

        <Card className="flex flex-1 flex-col gap-2 p-3">
          {unlocked && (
            <p className="rounded-2xl bg-amber-300 px-3 py-2 text-sm font-extrabold">
              {result!.unlocks.length > 0 && `${tr.unlockedNew} ${result!.unlocks.map((u) => tr.unlockNames[u.key as keyof typeof tr.unlockNames]).join(", ")} `}
              {result!.outfits.length > 0 && `${tr.outfitNew} ${result!.outfits.join(" ")}`}
            </p>
          )}
          {!unlocked && upcoming && s.mode === "normal" && (
            <p className="rounded-2xl bg-ink/5 px-3 py-1.5 text-center text-xs font-bold text-ink/70">🔒 {tr.nextUnlock(rm(upcoming.at - careerSen), tr.unlockNames[upcoming.key])}</p>
          )}
          {s.earned === 0 ? (
            <p className="rounded-2xl bg-ink/5 px-3 py-2 text-center text-sm font-bold text-ink/70">{tr.zeroScore}</p>
          ) : saved ? (
            <p className="rounded-2xl bg-leaf px-3 py-2 text-center text-sm font-extrabold text-white">
              {saved.rank ? (saved.daily ? tr.savedRankToday(saved.rank) : tr.savedRank(saved.rank)) : tr.saved}
              {username ? ` · @${username}` : ""}
            </p>
          ) : saving ? (
            <p className="rounded-2xl bg-ink/5 px-3 py-2 text-center text-sm font-bold">…</p>
          ) : null}
          {error && <p className="text-center text-xs font-bold text-chili">{error}</p>}
          <LeaderboardPanel board={board} highlight={username ?? undefined} compact light initialTab={s.mode === "daily" ? "today" : "week"} />
          <div className="mt-auto flex gap-2">
            <Btn tone="chili" size="md" onClick={() => void share()} className="flex-1">
              {tr.challengeFriends}
            </Btn>
            <Btn tone="amber" size="md" onClick={onRestart} className="flex-1">
              {tr.playAgain}
            </Btn>
          </div>
          <Btn tone="ghost" size="sm" onClick={onClose}>
            {tr.close}
          </Btn>
          {shareState === "copied" && <p className="text-center text-sm font-bold">{tr.copied}</p>}
        </Card>
      </div>
    </Overlay>
  );
}
