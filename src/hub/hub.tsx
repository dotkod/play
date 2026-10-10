"use client";

/**
 * Kuala Lepak hub: the city, its HUD and the doors into jobs. World rendering lives in
 * `src/city`; this file only orchestrates screens, overlays and audio.
 */

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BUILDINGS, inRect, roomRect, SPAWN } from "@/city/plan";
import { CityMinimap } from "@/city/components/minimap";
import { logoutAccount, refreshAuth, takeAuthHello, useAuth } from "@/core/auth-client";
import { emit } from "@/core/events";
import { JOB_RESULT_KEY, settleJobResults, type JobResult } from "@/core/job-handoff";
import { getProfile } from "@/core/profile";
import { ambience, audioReady, music, sfx, unlockAudio } from "@/shared/audio";
import { getLang, setLang, useLang } from "@/shared/lang";
import { LandscapeGate } from "@/shared/landscape-gate";
import { PHONE_DRAW_MS, player as playerShared, requestTeleport } from "@/world/player-bridge";
import { AuthGate, AuthSplash } from "./auth-gate";
import { CITY_TUTORIAL_FLAG, CityTutorial } from "./city-tutorial";
import { bindKeyboard, input } from "./controls";
import { PhoneButton, rm, WalletHud } from "./hud";
import { Phone } from "./phone/phone";
import { HUB_STRINGS } from "./strings";
import { MuteButton } from "./ui/buttons";
import { StartScreen } from "./ui/start-screen";
import { Joystick, LookPad } from "./ui/sticks";

const CityWorld = dynamic(() => import("@/city/components/world"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#9fdcd2] text-sm font-bold text-ink/60">…</div>,
});

const AnneMajuGame = dynamic(() => import("@/games/anne-maju/game").then((m) => m.AnneMajuGame), {
  ssr: false,
  // Match door veil so chunk load never flashes a separate “loading page”
  loading: () => <div className="fixed inset-0 z-40 bg-[#1a1410]" />,
});

const JOB_TITLES: Record<string, string> = { "anne-maju": "Anne Maju" };

const MAMAK = BUILDINGS.find((b) => b.kind === "mamak")!;
const MAMAK_ROOM = roomRect(MAMAK);
/** Opening `/anne-maju` (or `?kerja=anne-maju`) starts you standing inside the restaurant. */
const IN_SHOP_SPAWN = { x: MAMAK.door.x + 2.2, z: MAMAK_ROOM.minZ + 1.2, rotY: Math.PI };

function softKerjaUrl(slug: string | null) {
  try {
    // Only tweak the home URL — `/anne-maju` is already the same city shell
    if (window.location.pathname !== "/") return;
    window.history.replaceState({}, "", slug ? `/?kerja=${slug}` : "/");
  } catch {}
}

const noZone = () => {};

// Survives React Strict Mode's double useState init (which would otherwise settle payouts twice)
const BOOT_KEY = "kuala-lepak:city-boot";

/** Finished shifts stash a payout in sessionStorage; bank it on boot so the HUD updates at once. */
function bootPayout(): JobResult | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(BOOT_KEY);
    if (cached && !sessionStorage.getItem(JOB_RESULT_KEY)) return JSON.parse(cached) as JobResult | null;
    const payout = settleJobResults().results[0] ?? null;
    sessionStorage.setItem(BOOT_KEY, JSON.stringify(payout));
    return payout;
  } catch {
    return null;
  }
}

function bootKerja(initialJob?: string): string | null {
  if (initialJob === "anne-maju") return initialJob;
  if (typeof window === "undefined") return null;
  try {
    const q = new URLSearchParams(window.location.search).get("kerja");
    return q === "anne-maju" ? q : null;
  } catch {
    return null;
  }
}

export function Hub({ initialJob }: { initialJob?: string } = {}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const auth = useAuth();
  const [payout] = useState(bootPayout);
  const [jobOpen, setJobOpen] = useState(() => bootKerja(initialJob));
  const [started, setStarted] = useState(() => !!bootKerja(initialJob));
  const [shiftLive, setShiftLive] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(() =>
    payout && payout.earned > 0 ? { text: HUB_STRINGS[getLang()].paid(JOB_TITLES[payout.job] ?? payout.job, rm(payout.earned)), id: 1 } : null,
  );
  const [touch, setTouch] = useState(false);
  const toastSeq = useRef(1);
  const helloDone = useRef(false);

  const flash = (text: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToast({ text, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2800);
  };

  useEffect(() => bindKeyboard(), []);
  useEffect(() => {
    void refreshAuth();
  }, []);

  // After login/signup: drop into the city with a welcome toast, or the first-run tutorial
  useEffect(() => {
    if (!auth.username || helloDone.current) return;
    const hello = takeAuthHello();
    if (!hello) return;
    helloDone.current = true;
    const name = auth.username;
    // Defer so we don’t sync-setState inside the effect (React Compiler lint)
    window.setTimeout(() => {
      if (hello === "new" && !getProfile().flags[CITY_TUTORIAL_FLAG]) {
        setTutorialOpen(true);
        return;
      }
      unlockAudio();
      setStarted(true);
      flash(HUB_STRINGS[getLang()].welcomeBack(name));
    }, 50);
  }, [auth.username]);

  // Logout → AuthGate: stop audio and reset so the next login doesn’t stack music
  useEffect(() => {
    if (!auth.ready || auth.username) return;
    const id = window.setTimeout(() => {
      helloDone.current = false;
      setStarted(false);
      setTutorialOpen(false);
      setPhoneOpen(false);
      setPhoneBusy(false);
      music.stop();
      ambience.stop();
    }, 0);
    return () => clearTimeout(id);
  }, [auth.ready, auth.username]);

  // Prefetch the mamak job so the door never waits on a chunk
  useEffect(() => {
    void import("@/games/anne-maju/game");
  }, []);

  // Live KL weather + AQI (server-proxied); poll while in the city
  useEffect(() => {
    if (!started) return;
    let stop = false;
    void import("@/world/atmosphere").then(({ startAtmospherePolling }) => {
      if (!stop) startAtmospherePolling();
    });
    return () => {
      stop = true;
    };
  }, [started]);

  useEffect(() => {
    if (payout) emit({ type: "jobFinished", job: payout.job, earned: payout.earned, served: payout.served, mode: payout.mode });
  }, [payout]);

  // Sole owner of city music + ambience while exploring
  useEffect(() => {
    if (shiftLive || !started) {
      ambience.stop();
      if (!shiftLive) music.stop();
      return;
    }
    if (!audioReady()) unlockAudio();
    music.start("city");
    ambience.start();
    return () => {
      music.stop();
      ambience.stop();
    };
  }, [started, shiftLive]);

  useEffect(() => {
    if (!toast || toast.id !== 1) return;
    const id = setTimeout(() => setToast((t) => (t?.id === 1 ? null : t)), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  // Walking into Anne Maju opens the job right there (no screen change); walking out closes it
  const jobRef = useRef(jobOpen);
  useLayoutEffect(() => {
    jobRef.current = jobOpen;
  });
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const inside = inRect(playerShared.x, playerShared.z, MAMAK_ROOM);
      if (inside && !jobRef.current) {
        sfx.chime();
        softKerjaUrl("anne-maju");
        setJobOpen("anne-maju");
      } else if (!inside && jobRef.current && !shiftLive) {
        softKerjaUrl(null);
        setJobOpen(null);
      }
    }, 150);
    return () => clearInterval(id);
  }, [started, shiftLive]);

  useEffect(
    () => () => {
      if (phoneTimer.current) clearTimeout(phoneTimer.current);
    },
    [],
  );

  const start = () => {
    unlockAudio();
    sfx.start();
    setStarted(true);
  };

  const closePhone = () => {
    if (phoneTimer.current) {
      clearTimeout(phoneTimer.current);
      phoneTimer.current = null;
    }
    setPhoneOpen(false);
    setPhoneBusy(false);
    playerShared.phoneHeld = false;
    playerShared.phoneDrawUntil = 0;
  };

  const openPhone = () => {
    if (phoneBusy || phoneOpen) return;
    unlockAudio();
    sfx.chime();
    input.joy.x = 0;
    input.joy.y = 0;
    playerShared.phoneHeld = true;
    playerShared.phoneDrawUntil = Date.now() + PHONE_DRAW_MS;
    setPhoneBusy(true);
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    phoneTimer.current = setTimeout(() => {
      phoneTimer.current = null;
      setPhoneOpen(true);
    }, PHONE_DRAW_MS);
  };

  /** Leave the restaurant: back onto the mat outside, facing the street. */
  const exitJob = () => {
    const settled = settleJobResults();
    for (const pay of settled.results) {
      emit({ type: "jobFinished", job: pay.job, earned: pay.earned, served: pay.served, mode: pay.mode });
      if (pay.earned > 0) flash(tr.paid(JOB_TITLES[pay.job] ?? pay.job, rm(pay.earned)));
    }
    setShiftLive(false);
    setJobOpen(null);
    softKerjaUrl(null);
    unlockAudio();
    requestTeleport(MAMAK.door.x, MAMAK.door.z - (MAMAK.facing === "s" ? -1.2 : 1.2), MAMAK.facing === "s" ? 0 : Math.PI);
  };

  // Keyboard: Enter starts / uses the door, T toggles the phone
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!started && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        input.enter = false;
        start();
        return;
      }
      if (started && e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (phoneBusy || phoneOpen) closePhone();
        else openPhone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const mq = matchMedia("(pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // In the restaurant the job's own UI takes the corners; during a shift the city steps back
  const blocked = shiftLive;
  const showHint = started && !jobOpen && !phoneOpen && !phoneBusy;

  if (!auth.ready) return <AuthSplash />;
  if (!auth.username) return <AuthGate />;

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <LandscapeGate />
      <CityWorld spawn={bootKerja(initialJob) ? IN_SHOP_SPAWN : SPAWN} onZone={noZone} active={started && !blocked} />

      {!jobOpen && <WalletHud started={started} />}

      <div className={`edge-tr ${jobOpen ? "hidden" : ""} pointer-events-none absolute z-20 flex flex-col items-end gap-2`}>
        <div className="pointer-events-auto flex gap-2">
          <MuteButton />
          <div className="flex h-9 items-center rounded-xl bg-ink/80 p-1 text-xs font-extrabold shadow-lg">
            {(["ms", "en"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`h-full rounded-lg px-2 ${lang === l ? "bg-amber-300 text-ink" : "text-cream/70"}`}>
                {l === "ms" ? "BM" : "EN"}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={tr.logout}
            title={tr.logout}
            onClick={() => void logoutAccount()}
            className="grid h-9 place-items-center rounded-xl bg-ink/80 px-2.5 text-xs font-extrabold text-cream shadow-lg active:scale-95"
          >
            {tr.logout}
          </button>
        </div>
        {started && <CityMinimap size={touch ? 104 : 140} />}
      </div>

      {!started && !tutorialOpen && <StartScreen tr={tr} touch={touch} onStart={start} />}

      {tutorialOpen && (
        <CityTutorial
          username={auth.username}
          onDone={() => {
            setTutorialOpen(false);
            if (!started) start();
          }}
        />
      )}

      {toast && (
        <div key={toast.id} className={`pointer-events-none absolute inset-x-0 z-[60] flex justify-center px-4 ${phoneOpen || jobOpen ? "top-[16%] sm:top-1/4" : "bottom-28"}`}>
          <p className="animate-pop rounded-2xl bg-[#ff5a7a] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">{toast.text}</p>
        </div>
      )}

      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 px-4 text-center">
          <p className="rounded-full bg-ink/70 px-3 py-0.5 text-[11px] font-bold text-cream">{touch ? tr.hintTouch : tr.hintDesktop}</p>
        </div>
      )}

      {jobOpen === "anne-maju" && <AnneMajuGame onExit={exitJob} embedded seamless onLiveChange={setShiftLive} />}

      {started && !jobOpen && (
        <div className="edge-br absolute z-10 flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-ink/80 px-2 py-1 text-[10px] font-extrabold tracking-wide text-cream uppercase">
              {tr.phone}
              {!touch && <span className="ml-1 text-cream/60">T</span>}
            </span>
            <PhoneButton onOpen={openPhone} />
          </div>
        </div>
      )}

      <Phone open={phoneOpen} onClose={closePhone} />

      {started && touch && !phoneBusy && !shiftLive && (
        <>
          <Joystick />
          <LookPad />
        </>
      )}
    </div>
  );
}
