"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { logoutAccount, refreshAuth, takeAuthHello, useAuth } from "@/core/auth-client";
import { LandscapeGate } from "@/shared/landscape-gate";
import { AuthGate, AuthSplash } from "./auth-gate";
import { CityTutorial, CITY_TUTORIAL_FLAG } from "./city-tutorial";
import { emit } from "@/core/events";
import { type JobResult, JOB_RESULT_KEY, settleJobResults } from "@/core/job-handoff";
import { addItem, getProfile, removeItem, savePosition, setFlag, setHome, spendMoney } from "@/core/profile";
import {
  BUS_FARE_SEN,
  BUS_ROUTES,
  etaLabel,
  etaMinutes,
  routeForDest,
} from "@/content/transit/bus-routes";
import { anyRailNear, type RailLine, type RailStation } from "@/content/transit";
import { TAXI_FARE_SEN, TAXI_UNLOCK_FLAG, type TaxiDest } from "@/content/transit/taxi";
import { TAMAN_HOME_DOOR, TAMAN_SOFA } from "@/world/districts/taman-ceria/meta";
import { BusBoard } from "./bus-board";
import { BusRideOverlay, busDestLabel, type BusDest } from "./bus-ride";
import { CityMap } from "./city-map";
import { startTaskEngine } from "@/core/tasks/engine";
import { npcById, type NamedNpc } from "@/content/npcs";
import { OUTER_BUS_PLACES, placeById } from "@/content/places";
import { HomeInterior, isHomeBuilding } from "./home";
import { InteriorOverlay } from "./interior";
import { RailBoard } from "./rail-board";
import { RailRideOverlay } from "./rail-ride";
import { TaxiRideOverlay } from "./taxi-ride";
import { PHONE_DRAW_MS, player as playerShared } from "./traffic";
import { ambience, audioReady, music, setMuted, sfx, unlockAudio, useMuted } from "@/shared/audio";
import { getLang, setLang, useLang } from "@/shared/lang";
import { Logo } from "@/shared/logo";
import { CATS, petCat } from "./cats";
import { bindKeyboard, input, view } from "./controls";
import { DialogueBox } from "./dialogue-box";
import { PhoneButton, rm, TaskBanner, WalletHud } from "./hud";
import { Minimap } from "./minimap";
import { nearestNamedNpc } from "./named-npcs";
import { Phone } from "./phone/phone";
import { HUB_STRINGS } from "./strings";
import { DEFAULT_SPAWN } from "@/world/districts/pusat-lepak/layout";
import { type Building, BUILDINGS, doorSpot } from "./world-data";

const World = dynamic(() => import("./world"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#9fdcd2] text-sm font-bold text-ink/60">…</div>,
});

const AnneMajuGame = dynamic(() => import("@/games/anne-maju/game").then((m) => m.AnneMajuGame), {
  ssr: false,
  // Match door veil so chunk load never flashes a separate “loading page”
  loading: () => <div className="fixed inset-0 z-40 bg-[#1a1410]" />,
});

function softKerjaUrl(slug: string | null) {
  try {
    // Only tweak the home URL — `/anne-maju` is already the same city shell
    if (window.location.pathname !== "/") return;
    window.history.replaceState({}, "", slug ? `/?kerja=${slug}` : "/");
  } catch {}
}

// Games send players back here with this key so they reappear at the building they left
export const SPAWN_KEY = "dotkod-play:spawn";
// Survives React Strict Mode's double useState init (which would otherwise eat SPAWN_KEY twice)
const BOOT_KEY = "kuala-lepak:city-boot";

type CityBoot = {
  spawn: { x: number; z: number; rotY: number };
  returning: boolean;
  payout: JobResult | null;
};

// Returning from a game skips the start screen and puts you back at that building's door.
// Finished shifts stash a payout in sessionStorage; we bank it here so the HUD updates immediately.
function bootCity(): CityBoot {
  const fresh: CityBoot = { spawn: DEFAULT_SPAWN, returning: false, payout: null };
  if (typeof window === "undefined") return fresh;
  try {
    const hasFresh = sessionStorage.getItem(SPAWN_KEY) || sessionStorage.getItem(JOB_RESULT_KEY);
    const cached = sessionStorage.getItem(BOOT_KEY);
    // Reuse the cache only for Strict Mode's second init (keys already consumed)
    if (cached && !hasFresh) return JSON.parse(cached) as CityBoot;

    const id = sessionStorage.getItem(SPAWN_KEY);
    sessionStorage.removeItem(SPAWN_KEY);
    const b = BUILDINGS.find((x) => x.id === id);
    const settled = settleJobResults();
    const payout = settled.results[0] ?? null;
    const result: CityBoot = !b
      ? { ...fresh, payout }
      : {
          spawn: (() => {
            const d = doorSpot(b);
            return { x: d.x, z: d.z + d.facing * 1.2, rotY: d.facing > 0 ? 0 : Math.PI };
          })(),
          returning: true,
          payout,
        };
    sessionStorage.setItem(BOOT_KEY, JSON.stringify(result));
    return result;
  } catch {
    return fresh;
  }
}

function dialogueFor(npc: NamedNpc) {
  const p = getProfile();
  if (npc.id === "uncle-raju") {
    if (!p.tasks.done.includes("hp-2-raju-shift") && p.tasks.active.some((t) => t.id === "hp-2-raju-shift")) return "raju-hire";
    if (!p.tasks.done.includes("hp-3-raju-rm15") && p.tasks.active.some((t) => t.id === "hp-3-raju-rm15")) return "raju-challenge";
    return "raju-idle";
  }
  if (npc.id === "makcik-kiah") {
    if (p.tasks.active.some((t) => t.id === "hp-4-nasi-lemak") && !p.flags["talked:kiah-delivery"]) return "kiah-delivery";
    return "kiah-idle";
  }
  if (npc.id === "pakcik-osman") {
    // Delivery thank-you + cats ask (opened after giving parcel, or if quest is on that step)
    if (p.tasks.active.some((t) => t.id === "hp-4-nasi-lemak" || t.id === "hp-5-cats") && !p.flags["talked:osman-cats"]) {
      return "osman-cats";
    }
    return "osman-idle";
  }
  if (npc.id === "ah-seng") return "ahseng-hello";
  if (npc.id === "kumar") {
    if (!p.flags.taxiUnlocked) return "kumar-taxi";
    return "kumar-idle";
  }
  return null;
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
  const [{ spawn, returning, payout }] = useState(bootCity);
  const [jobOpen, setJobOpen] = useState(() => bootKerja(initialJob));
  const [started, setStarted] = useState(() => returning || !!bootKerja(initialJob));
  const [doorVeil, setDoorVeil] = useState<"cover" | "unveil" | null>(null);
  const doorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zone, setZone] = useState<Building | null>(null);
  const [nearCat, setNearCat] = useState<number | null>(null);
  const [nearNpc, setNearNpc] = useState<NamedNpc | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [busRide, setBusRide] = useState<BusDest | null>(null);
  const [busBoardOpen, setBusBoardOpen] = useState(false);
  const [railRide, setRailRide] = useState<{ line: RailLine; to: RailStation } | null>(null);
  const [railBoard, setRailBoard] = useState<{ line: RailLine; from: string } | null>(null);
  const [nearRail, setNearRail] = useState<{ line: RailLine; station: RailStation } | null>(null);
  const [taxiRide, setTaxiRide] = useState<TaxiDest | null>(null);
  const [nearStop, setNearStop] = useState<"pusat" | BusDest | null>(null);
  const [inside, setInside] = useState<Building | null>(null);
  const [nearSofa, setNearSofa] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialogue, setDialogue] = useState<{ npcId: string; dialogueId: string } | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(() => {
    if (!payout || payout.earned <= 0) return null;
    const job = BUILDINGS.find((b) => b.game?.slug === payout.job)?.game?.title ?? payout.job;
    return { text: HUB_STRINGS[getLang()].paid(job, rm(payout.earned)), id: 1 };
  });
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

  // After login/signup: drop into the city (can move) + welcome toast / first-run tutorial
  useEffect(() => {
    if (!auth.username || helloDone.current) return;
    const hello = takeAuthHello();
    if (!hello) return;
    helloDone.current = true;
    const name = auth.username;
    // Defer so we don’t sync-setState inside the effect (React Compiler lint)
    const id = window.setTimeout(() => {
      if (hello === "new" && !getProfile().flags[CITY_TUTORIAL_FLAG]) {
        setTutorialOpen(true);
        return;
      }
      // Returning login: skip start screen so you can walk immediately.
      // BGM is owned solely by the started/jobOpen effect — don’t start it here.
      unlockAudio();
      setStarted(true);
      flash(HUB_STRINGS[getLang()].welcomeBack(name));
    }, 50);
    // Do not clearTimeout on cleanup — Strict Mode would cancel the welcome toast
    return () => {
      void id;
    };
  }, [auth.username]);

  // Logout → AuthGate: stop audio and reset explore state so the next login doesn’t stack BGM
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

  // Prefetch mamak job so entering the door never waits on a chunk
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
    return () => {
      if (doorTimer.current) clearTimeout(doorTimer.current);
    };
  }, []);

  useEffect(() => {
    const stop = startTaskEngine();
    if (payout) {
      emit({ type: "jobFinished", job: payout.job, earned: payout.earned, served: payout.served, mode: payout.mode });
    }
    return stop;
  }, [payout]);

  // Sole owner of city BGM + ambience while exploring
  useEffect(() => {
    if (jobOpen || !started) {
      ambience.stop();
      music.stop();
      return;
    }
    if (!audioReady()) unlockAudio();
    music.start("city");
    ambience.start();
    return () => {
      music.stop();
      ambience.stop();
    };
  }, [started, jobOpen]);

  useEffect(() => {
    if (!toast || toast.id !== 1) return;
    const id = setTimeout(() => setToast((t) => (t?.id === 1 ? null : t)), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (zone) sfx.chime();
  }, [zone]);

  // Proximity: places + named NPCs (emit entered once per place visit)
  const lastPlace = useRef<string | null>(null);
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const px = playerShared.x;
      const pz = playerShared.z;
      setNearNpc(nearestNamedNpc(px, pz));
      let here: string | null = null;
      const visitIds = [
        "bus-stop",
        "nasi-lemak-stall",
        "anne-maju",
        "runcit",
        "taman-ceria-home",
        "klcc-park",
        "menara-lepak",
        "tlx-tower",
        "bukit-bintik",
        "stadium-bukit-jalan",
        "kampung-lepak",
        "pasar-besar",
        "petaling-lane",
        "sentral-lepak",
        "lrt-pusat",
        "lrt-klcc",
        "lrt-kampung",
        "lrt-sentral",
        "lrt-taman",
        ...OUTER_BUS_PLACES,
      ];
      for (const place of visitIds) {
        const pl = placeById(place);
        if (pl && Math.hypot(pl.x - px, pl.z - pz) < 2.6) {
          here = place;
          break;
        }
      }
      if (here && here !== lastPlace.current) emit({ type: "entered", place: here });
      lastPlace.current = here;

      const pusatBus = placeById("bus-stop");
      if (pusatBus && Math.hypot(pusatBus.x - px, pusatBus.z - pz) < 2.8) setNearStop("pusat");
      else {
        let outer: BusDest | null = null;
        for (const id of OUTER_BUS_PLACES) {
          const pl = placeById(id);
          if (pl && Math.hypot(pl.x - px, pl.z - pz) < 2.8) {
            // place id "taman-ceria-bus" → dest "taman-ceria"
            outer = id.replace(/-bus$/, "") as BusDest;
            break;
          }
        }
        setNearStop(outer);
      }

      const rail = anyRailNear(px, pz);
      setNearRail(rail);
      if (rail) {
        const key = `discovered:${rail.station.place}`;
        if (!getProfile().flags[key]) setFlag(key, true);
      }

      setNearSofa(Math.hypot(TAMAN_SOFA.x - px, TAMAN_SOFA.z - pz) < 2.2);
    }, 200);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      savePosition(playerShared.districtId, playerShared.x, playerShared.z);
    }, 8000);
    return () => clearInterval(id);
  }, [started]);

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
    input.target = null;
    input.joy.x = 0;
    input.joy.y = 0;
    playerShared.crouchUntil = 0;
    playerShared.phoneHeld = true;
    playerShared.phoneDrawUntil = Date.now() + PHONE_DRAW_MS;
    setPhoneBusy(true);
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    phoneTimer.current = setTimeout(() => {
      phoneTimer.current = null;
      setPhoneOpen(true);
    }, PHONE_DRAW_MS);
  };

  useEffect(() => () => {
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
  }, []);

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

  const pet = (i: number) => {
    unlockAudio();
    const n = petCat(i);
    flash(tr.catLoves(CATS[i].name, n));
  };

  const clearDoorTimer = () => {
    if (doorTimer.current) {
      clearTimeout(doorTimer.current);
      doorTimer.current = null;
    }
  };

  const enter = (b: Building) => {
    unlockAudio();
    sfx.doorbell();
    if (b.game) {
      ambience.stop();
      music.stop();
      emit({ type: "entered", place: b.id });
      // Door veil → mount job → unveil (same session, no route change)
      clearDoorTimer();
      setDoorVeil("cover");
      doorTimer.current = setTimeout(() => {
        setJobOpen(b.game!.slug);
        softKerjaUrl(b.game!.slug);
        setDoorVeil("unveil");
        doorTimer.current = setTimeout(() => {
          setDoorVeil(null);
          doorTimer.current = null;
        }, 380);
      }, 320);
      return;
    }
    if (b.interior) {
      setInside(b);
      emit({ type: "entered", place: isHomeBuilding(b) ? "taman-ceria-home" : b.id });
      if (isHomeBuilding(b)) {
        setHome(b.id);
        savePosition("taman-ceria", TAMAN_HOME_DOOR.x, TAMAN_HOME_DOOR.z);
      }
    }
  };

  const sleepHome = () => {
    playerShared.crouchUntil = Date.now() + 2200;
    emit({ type: "sat", place: "taman-ceria-home" });
    flash(tr.sleptHome);
  };

  const exitJob = () => {
    clearDoorTimer();
    setDoorVeil("cover");
    doorTimer.current = setTimeout(() => {
      const settled = settleJobResults();
      setJobOpen(null);
      softKerjaUrl(null);
      unlockAudio();
      // City BGM resumes via the started/jobOpen effect
      for (const pay of settled.results) {
        emit({ type: "jobFinished", job: pay.job, earned: pay.earned, served: pay.served, mode: pay.mode });
        if (pay.earned > 0) {
          const title = BUILDINGS.find((x) => x.game?.slug === pay.job)?.game?.title ?? pay.job;
          flash(tr.paid(title, rm(pay.earned)));
        }
      }
      setDoorVeil("unveil");
      doorTimer.current = setTimeout(() => {
        setDoorVeil(null);
        doorTimer.current = null;
      }, 380);
    }, 280);
  };

  const leaveInterior = () => {
    setInside(null);
    sfx.chime();
  };

  const openTalk = (npcId: string, dialogueId: string) => {
    const n = npcById(npcId);
    view.talk = n ? { npcId, x: n.x, z: n.z } : null;
    setDialogue({ npcId, dialogueId });
  };

  const closeTalk = () => {
    view.talk = null;
    setDialogue(null);
  };

  const talk = (npc: NamedNpc) => {
    // Hand over nasi lemak, then open the thank-you / cats chat (don't silent-return)
    if (npc.id === "pakcik-osman" && (getProfile().inventory["nasi-lemak-bungkus"] ?? 0) > 0) {
      if (removeItem("nasi-lemak-bungkus", 1)) {
        emit({ type: "gave", item: "nasi-lemak-bungkus", npc: npc.id });
        flash(tr.gave(lang === "ms" ? "nasi lemak" : "nasi lemak", npc.name[lang]));
      }
      openTalk(npc.id, "osman-cats");
      return;
    }
    const id = dialogueFor(npc);
    if (!id) return;
    openTalk(npc.id, id);
  };

  const buyFrom = (npc: NamedNpc) => {
    if (!npc.shop) return;
    const ok = spendMoney(npc.shop.price, `Beli ${npc.shop.labelMs}`, `Buy ${npc.shop.labelEn}`);
    if (!ok) {
      flash(tr.needMoney);
      return;
    }
    addItem(npc.shop.item, 1);
    emit({ type: "bought", item: npc.shop.item, at: "nasi-lemak-stall" });
    flash(tr.bought(lang === "ms" ? npc.shop.labelMs : npc.shop.labelEn));
  };

  const sitHome = () => {
    playerShared.crouchUntil = Date.now() + 2200;
    emit({ type: "sat", place: "taman-ceria-home" });
    emit({ type: "entered", place: "taman-ceria-home" });
    flash(tr.satHome);
    savePosition("taman-ceria", TAMAN_SOFA.x, TAMAN_SOFA.z);
  };

  const openRailBoard = (line: RailLine, from: string) => {
    unlockAudio();
    sfx.chime();
    setRailBoard({ line, from });
  };

  const pickRail = (line: RailLine, dest: RailStation) => {
    const ok = spendMoney(line.fareSen, line.fareLabel.ms, line.fareLabel.en);
    if (!ok) {
      flash(tr.needMoney);
      return;
    }
    setRailBoard(null);
    unlockAudio();
    sfx.chime();
    setRailRide({ line, to: dest });
  };

  const pickTaxi = (dest: TaxiDest) => {
    if (!getProfile().flags[TAXI_UNLOCK_FLAG]) {
      flash(tr.taxiLocked);
      return;
    }
    const ok = spendMoney(TAXI_FARE_SEN, "Teksi Kumar", "Kumar taxi");
    if (!ok) {
      flash(tr.needMoney);
      return;
    }
    closePhone();
    setMapOpen(false);
    unlockAudio();
    sfx.chime();
    setTaxiRide(dest);
  };

  const pickPetaRail = (line: RailLine, dest: RailStation) => {
    const ok = spendMoney(line.fareSen, line.fareLabel.ms, line.fareLabel.en);
    if (!ok) {
      flash(tr.needMoney);
      return;
    }
    closePhone();
    unlockAudio();
    sfx.chime();
    setRailRide({ line, to: dest });
  };

  const pickBus = (dest: BusDest) => {
    const ok = spendMoney(BUS_FARE_SEN, "Tiket bas RapidLepak", "RapidLepak bus ticket");
    if (!ok) {
      flash(tr.needMoney);
      return;
    }
    setBusBoardOpen(false);
    unlockAudio();
    sfx.chime();
    setBusRide(dest);
  };

  const rideBusHome = () => {
    const ok = spendMoney(BUS_FARE_SEN, "Tiket bas RapidLepak", "RapidLepak bus ticket");
    if (!ok) {
      flash(tr.needMoney);
      return;
    }
    unlockAudio();
    sfx.chime();
    setBusRide("pusat-lepak");
  };

  const returnBusCaption = () => {
    const dest = nearStop && nearStop !== "pusat" ? nearStop : null;
    const r = (dest ? routeForDest(dest) : null) ?? BUS_ROUTES[0];
    return tr.busReturnEta(r.id, etaLabel(etaMinutes(r), lang));
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (!input.enter) return;
      input.enter = false;
      if (!started || dialogue || phoneOpen || phoneBusy || busRide || busBoardOpen || railRide || railBoard || taxiRide || jobOpen || inside) return;
      if (nearSofa) sitHome();
      else if (nearRail) openRailBoard(nearRail.line, nearRail.station.id);
      else if (nearStop && nearStop !== "pusat") rideBusHome();
      else if (nearStop === "pusat") {
        unlockAudio();
        sfx.chime();
        setBusBoardOpen(true);
      } else if (zone?.game || zone?.interior) enter(zone);
      else if (nearNpc) talk(nearNpc);
      else if (nearCat !== null) pet(nearCat);
    }, 50);
    return () => clearInterval(id);
  });

  const blocked = !!(busRide || busBoardOpen || railRide || railBoard || taxiRide || jobOpen || inside || doorVeil);
  const showHint =
    started && !zone && !nearNpc && nearCat === null && !dialogue && !phoneOpen && !phoneBusy && !blocked;

  if (!auth.ready) return <AuthSplash />;
  if (!auth.username) return <AuthGate />;

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <LandscapeGate />
      <World spawn={spawn} onZone={setZone} onNearCat={setNearCat} active={started && !blocked} />

      <WalletHud started={started} />
      <TaskBanner started={started} />

      <div className="edge-tr pointer-events-none absolute z-20 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex gap-2">
          <MuteButton />
          <div className="flex h-9 items-center rounded-xl bg-ink/80 p-1 text-xs font-extrabold shadow-lg">
            {(["ms", "en"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`h-full rounded-lg px-2 ${lang === l ? "bg-amber-300 text-ink" : "text-cream/70"}`}>
                {l === "ms" ? "BM" : "EN"}
              </button>
            ))}
          </div>
          {auth.username && (
            <button
              type="button"
              aria-label={tr.logout}
              title={tr.logout}
              onClick={() => void logoutAccount()}
              className="grid h-9 place-items-center rounded-xl bg-ink/80 px-2.5 text-xs font-extrabold text-cream shadow-lg active:scale-95"
            >
              {tr.logout}
            </button>
          )}
        </div>
        {started && (
          <div className="pointer-events-auto">
            <Minimap size={touch ? 104 : 140} onOpen={() => setMapOpen(true)} />
          </div>
        )}
      </div>

      {!started && !tutorialOpen && <StartScreen tr={tr} touch={touch} onStart={start} />}

      {tutorialOpen && auth.username && (
        <CityTutorial
          username={auth.username}
          onDone={() => {
            setTutorialOpen(false);
            if (!started) start();
          }}
        />
      )}

      {toast && (
        <div
          key={toast.id}
          className={`pointer-events-none absolute inset-x-0 z-[60] flex justify-center px-4 ${
            busBoardOpen || railBoard || busRide || railRide || taxiRide || phoneOpen || inside || jobOpen
              ? "top-[16%] sm:top-1/4"
              : "bottom-28"
          }`}
        >
          <p className="animate-pop rounded-2xl bg-[#ff5a7a] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">
            {toast.text}
          </p>
        </div>
      )}

      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 px-4 text-center">
          <p className="rounded-full bg-amber-300 px-4 py-1.5 text-sm font-extrabold text-ink shadow-[0_4px_0_#1f1a17]">📱 {tr.appMesej}</p>
          <p className="rounded-full bg-ink/70 px-3 py-0.5 text-[11px] font-bold text-cream">{touch ? tr.hintTouch : tr.hintDesktop}</p>
        </div>
      )}

      {busRide && <BusRideOverlay dest={busRide} onDone={() => setBusRide(null)} />}
      <BusBoard open={busBoardOpen} onClose={() => setBusBoardOpen(false)} onPick={pickBus} />
      {railRide && <RailRideOverlay line={railRide.line} to={railRide.to} onDone={() => setRailRide(null)} />}
      {railBoard && (
        <RailBoard
          open
          line={railBoard.line}
          from={railBoard.from}
          onClose={() => setRailBoard(null)}
          onPick={(dest) => pickRail(railBoard.line, dest)}
        />
      )}
      {taxiRide && <TaxiRideOverlay dest={taxiRide} onDone={() => setTaxiRide(null)} />}
      <CityMap open={mapOpen} onClose={() => setMapOpen(false)} />

      {jobOpen === "anne-maju" && (
        <div className="job-settle fixed inset-0 z-40">
          <AnneMajuGame onExit={exitJob} embedded />
        </div>
      )}
      {inside &&
        (isHomeBuilding(inside) ? (
          <HomeInterior onLeave={leaveInterior} onSleep={sleepHome} />
        ) : (
          <InteriorOverlay building={inside} onLeave={leaveInterior} />
        ))}
      {doorVeil && (
        <div
          className={`pointer-events-none fixed inset-0 z-[50] bg-[#1a1410] ${doorVeil === "cover" ? "door-veil" : "door-unveil"}`}
          aria-hidden
        />
      )}

      {started && !dialogue && !blocked && (
        <div className="edge-br absolute z-10 flex flex-col items-end gap-3">
          {nearSofa && (
            <ActionButton icon="🛋" label={tr.sitSofa} keyHint={!touch ? "E" : undefined} tone="cream" size="lg" onClick={sitHome} />
          )}
          {nearRail && (
            <ActionButton
              icon={nearRail.line.emoji}
              label={tr.railEnter}
              caption={rm(nearRail.line.fareSen)}
              keyHint={!touch && !nearSofa ? "E" : undefined}
              tone="amber"
              size="lg"
              onClick={() => openRailBoard(nearRail.line, nearRail.station.id)}
            />
          )}
          {nearStop === "pusat" && !nearRail && (
            <ActionButton
              icon="🚌"
              label={tr.busOpenBoard}
              caption={tr.busFare}
              keyHint={!touch && !nearSofa ? "E" : undefined}
              tone="amber"
              size="lg"
              onClick={() => {
                unlockAudio();
                sfx.chime();
                setBusBoardOpen(true);
              }}
            />
          )}
          {nearStop && nearStop !== "pusat" && (
            <ActionButton
              icon="🚌"
              label={busDestLabel("pusat-lepak", tr)}
              caption={returnBusCaption()}
              keyHint={!touch && !nearSofa ? "E" : undefined}
              tone="amber"
              size="lg"
              onClick={rideBusHome}
            />
          )}
          {nearCat !== null && (
            <ActionButton
              icon="🐱"
              label={tr.petCat(CATS[nearCat].name)}
              keyHint={!touch && !zone && !nearNpc ? "E" : undefined}
              tone="cream"
              size={zone || nearNpc ? "sm" : "lg"}
              onClick={() => pet(nearCat)}
            />
          )}
          {nearNpc && (
            <>
              {nearNpc.shop && (
                <ActionButton
                  icon="🛒"
                  label={tr.buy(lang === "ms" ? nearNpc.shop.labelMs : nearNpc.shop.labelEn, rm(nearNpc.shop.price))}
                  tone="cream"
                  size="sm"
                  onClick={() => buyFrom(nearNpc)}
                />
              )}
              <ActionButton
                icon="💬"
                label={tr.talk(nearNpc.name[lang])}
                keyHint={!touch && !zone ? "E" : undefined}
                tone="cream"
                size={zone ? "sm" : "lg"}
                onClick={() => talk(nearNpc)}
              />
            </>
          )}
          {zone &&
            (zone.game ? (
              <ActionButton
                icon="▶"
                label={`${zone.game.emoji} ${zone.game.title}`}
                caption={tr.enter}
                keyHint={!touch ? "E" : undefined}
                tone="amber"
                size="lg"
                onClick={() => enter(zone)}
              />
            ) : zone.interior ? (
              <ActionButton
                icon={zone.interior.emoji}
                label={zone.interior.title}
                caption={isHomeBuilding(zone) ? tr.enterHome : tr.enter}
                keyHint={!touch ? "E" : undefined}
                tone="cream"
                size="lg"
                onClick={() => enter(zone)}
              />
            ) : zone.lrt ? null : zone.soon ? (
              <ActionButton
                icon="🔒"
                label={`${zone.soon.emoji} ${zone.soon.title}`}
                caption={tr.soon}
                sub={tr.soonBody}
                tone="muted"
                size="lg"
              />
            ) : null)}
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-ink/80 px-2 py-1 text-[10px] font-extrabold tracking-wide text-cream uppercase">
              {tr.phone}
              {!touch && <span className="ml-1 text-cream/60">T</span>}
            </span>
            <PhoneButton onOpen={openPhone} />
          </div>
        </div>
      )}

      {dialogue && <DialogueBox dialogueId={dialogue.dialogueId} npcId={dialogue.npcId} onClose={closeTalk} />}
      <Phone
        open={phoneOpen}
        onClose={closePhone}
        onOpenMap={() => setMapOpen(true)}
        onRailTravel={pickPetaRail}
        onTaxiTravel={pickTaxi}
      />

      {started && touch && !phoneBusy && !dialogue && (
        <>
          <Joystick />
          <LookPad />
        </>
      )}
    </div>
  );
}

// Title screen over the live city: logo, what's inside, and one big button to start walking
function StartScreen({ tr, touch, onStart }: { tr: (typeof HUB_STRINGS)["ms"]; touch: boolean; onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex cursor-pointer overflow-y-auto text-center text-cream" onClick={onStart}>
      {/* Warm golden-hour vignette: the live city stays visible in the middle */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(31,26,23,0.15)_0%,rgba(31,26,23,0.55)_55%,rgba(31,26,23,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#ff9a3d]/25 via-transparent to-[#2f1b4a]/35" />

      <div className="safe-px relative m-auto flex flex-col items-center gap-4 py-8 max-sm:[zoom:0.78] [@media(max-height:480px)]:[zoom:0.72]">
        {/* Logo with a sticker badge slapped on the corner */}
        <div className="relative animate-[float_4s_ease-in-out_infinite]">
          <h1 className="animate-pop">
            <Logo size="lg" className="items-center" />
          </h1>
          <span className="absolute -right-8 -bottom-3 -rotate-6 rounded-full border-[3px] border-ink bg-chili px-3 py-1 text-xs font-extrabold whitespace-nowrap text-white shadow-[0_3px_0_#1f1a17] sm:-right-10 sm:text-sm">
            🇲🇾 {tr.brand}
          </span>
        </div>

        {/* Tagline as a comic speech bubble */}
        <div className="relative mt-1 max-w-md rounded-2xl border-[3px] border-ink bg-cream px-5 py-3 text-base leading-snug font-bold text-ink shadow-[0_5px_0_#1f1a17] sm:text-lg">
          <span className="absolute -top-[11px] left-1/2 size-5 -translate-x-1/2 rotate-45 border-t-[3px] border-l-[3px] border-ink bg-cream" />
          {tr.tagline}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          className="mt-2 animate-[glow_2.2s_ease-in-out_infinite] rounded-2xl border-4 border-ink bg-amber-300 px-10 py-4 text-2xl font-extrabold text-ink transition hover:-translate-y-0.5 active:translate-y-1 sm:text-3xl"
        >
          {tr.startCta}
        </button>

        {/* Controls as keycaps (desktop) or a simple hint (touch) */}
        {touch ? (
          <p className="rounded-full bg-ink/60 px-4 py-1.5 text-xs font-bold text-cream/90 backdrop-blur">🕹️ {tr.controlsTouch.replace("🎮 ", "")}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-ink/55 px-4 py-2 text-xs font-bold text-cream/90 backdrop-blur">
            <span className="flex items-center gap-1">
              {["W", "A", "S", "D"].map((k) => (
                <Keycap key={k}>{k}</Keycap>
              ))}
              <span className="ml-1">{tr.keysWalk}</span>
            </span>
            <span className="flex items-center gap-1">
              <Keycap wide>Enter</Keycap>
              <span>{tr.keysEnter}</span>
            </span>
            <span className="flex items-center gap-1">
              <Keycap>🖱️</Keycap>
              <span>{tr.keysClick}</span>
            </span>
          </div>
        )}

        <p className="mt-1 text-[11px] font-bold tracking-wide text-cream/60">{tr.madeIn}</p>
      </div>
    </div>
  );
}

function Keycap({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <kbd
      className={`grid h-6 place-items-center rounded-md border-2 border-cream/80 bg-cream/10 text-[11px] font-extrabold text-cream shadow-[0_2px_0_rgba(251,243,228,0.6)] ${wide ? "px-1.5" : "w-6"}`}
    >
      {children}
    </kbd>
  );
}

// Round thumb-sized action with a label chip on its left
function ActionButton({
  icon,
  label,
  caption,
  sub,
  keyHint,
  tone,
  size,
  onClick,
}: {
  icon: string;
  label: string;
  caption?: string;
  sub?: string;
  keyHint?: string;
  tone: "amber" | "cream" | "muted";
  size: "sm" | "lg";
  onClick?: () => void;
}) {
  const circle = size === "lg" ? "size-20 text-3xl" : "size-14 text-2xl";
  const colors = tone === "amber" ? "bg-amber-300 text-ink" : tone === "cream" ? "bg-cream text-ink" : "bg-ink/60 text-cream/80";
  return (
    <div className="flex animate-pop items-center gap-2">
      <div className="max-w-[46vw] rounded-2xl bg-ink/80 px-3 py-1.5 text-right text-cream shadow-lg">
        <p className="text-sm leading-tight font-extrabold">{label}</p>
        {sub && <p className="text-[11px] leading-tight font-bold text-cream/70">{sub}</p>}
      </div>
      <button
        type="button"
        disabled={!onClick}
        onClick={onClick}
        aria-label={caption ? `${caption}: ${label}` : label}
        className={`relative grid ${circle} shrink-0 place-items-center rounded-full border-4 border-ink font-extrabold shadow-[0_5px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17] disabled:active:translate-y-0 ${colors}`}
      >
        <span className="leading-none">{icon}</span>
        {caption && <span className="absolute bottom-1.5 text-[10px] leading-none font-extrabold uppercase">{caption}</span>}
        {keyHint && (
          <span className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-md border-2 border-ink bg-cream text-[11px] font-extrabold text-ink">
            {keyHint}
          </span>
        )}
      </button>
    </div>
  );
}

function MuteButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      aria-label={muted ? "Unmute" : "Mute"}
      onClick={(e) => {
        e.stopPropagation();
        unlockAudio();
        setMuted(!muted);
      }}
      className="grid size-9 place-items-center rounded-xl bg-ink/80 text-lg shadow-lg active:scale-95"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

// Thumb stick for touch screens, bottom-left
function Joystick() {
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
function LookPad() {
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
