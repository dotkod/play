"use client";

/**
 * After a shift: record the personal best, post to the leaderboard under your @username,
 * and offer a share link. Shared by the results card and the standalone results screen.
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/core/auth-client";
import { sfx } from "@/shared/audio";
import { shareResult, type ShareOutcome } from "@/shared/share";
import { useBestScore } from "@/shared/use-best-score";
import { useLang, useT } from "../i18n";
import { useBoard } from "../leaderboard-panel";
import { GAME } from "../meta";
import { dailyKey } from "../progress";
import { encodeResult, nextRank, rankFor, rm } from "../result";
import type { GameState } from "../state";

export function useShiftScore(s: GameState) {
  const tr = useT();
  const lang = useLang();
  const auth = useAuth();
  const { best, submit } = useBestScore(GAME.storageKey);
  const [prevBest] = useState(best);
  const [shareState, setShareState] = useState<ShareOutcome | null>(null);
  const { board, refresh } = useBoard();
  const [saved, setSaved] = useState<{ rank: number | null; daily: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posted = useRef(false);

  useEffect(() => {
    submit(s.earned);
    if (s.earned > prevBest && prevBest > 0) sfx.record();
  }, [s.earned, submit, prevBest]);

  useEffect(() => {
    if (posted.current || s.earned === 0 || !auth.username) return;
    let cancelled = false;
    setSaving(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ earned: s.earned, served: s.served, mode: s.mode, day: dailyKey() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? tr.saveFailed);
        if (cancelled) return;
        posted.current = true;
        setSaved({ rank: data.rank, daily: !!data.daily });
        sfx.correct();
        await refresh();
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setSaving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [s.earned, s.served, s.mode, auth.username, refresh, tr.saveFailed]);

  const rank = rankFor(s.earned, lang);
  const share = async () => {
    sfx.tap();
    const path = `/${GAME.slug}/k/${encodeResult({ earned: s.earned, served: s.served })}`;
    setShareState(
      await shareResult({
        title: GAME.name,
        text: tr.shareText(rm(s.earned), rank.emoji, rank.title),
        url: `${window.location.origin}${path}`,
        image: `${path}/opengraph-image`,
      }),
    );
  };

  return {
    rank,
    next: nextRank(s.earned, lang),
    isRecord: s.earned > prevBest,
    saved,
    saving,
    error,
    board,
    username: auth.username,
    share,
    shareState,
  };
}
