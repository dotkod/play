"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getAuth, loginAccount, logoutAccount, registerAccount, useAuth } from "@/core/auth-client";
import { XP_PER_LEVEL, addMoney, markInboxRead, spendMoney, unreadInboxCount, useProfile } from "@/core/profile";
import { fare, rideBusy } from "@/lrt/components/fare";
import { floorYAt } from "@/lrt/plan";
import { sfx, setMuted, useMuted } from "@/shared/audio";
import { setLang, useLang } from "@/shared/lang";
import { player } from "@/world/player-bridge";
import { TAXI_FARE_SEN, taxiDestChoices } from "@/city/sim/taxi-dests";
import { startTaxiRide, taxiBusy } from "@/city/sim/taxi-ride";
import { HUB } from "../meta";
import { rm } from "../hud";
import { HUB_STRINGS } from "../strings";

type AppId = "home" | "mesej" | "profil" | "dompet" | "tetapan" | "teksi";
type IconKind = "mesej" | "tugasan" | "profil" | "dompet" | "tetapan" | "kerja" | "peta" | "teksi";

const APP_ICON: Record<IconKind, { bg: string }> = {
  mesej: { bg: "linear-gradient(160deg,#64d2ff 0%,#0a84ff 55%,#0071e3 100%)" },
  tugasan: { bg: "linear-gradient(160deg,#ffd60a 0%,#ff9f0a 45%,#ff453a 100%)" },
  profil: { bg: "linear-gradient(160deg,#ff6b6b 0%,#ee5a24 45%,#c44569 100%)" },
  dompet: { bg: "linear-gradient(160deg,#30d158 0%,#34c759 40%,#248a3d 100%)" },
  tetapan: { bg: "linear-gradient(160deg,#d1d1d6 0%,#8e8e93 50%,#636366 100%)" },
  kerja: { bg: "linear-gradient(160deg,#bf5af2 0%,#5e5ce6 100%)" },
  peta: { bg: "linear-gradient(160deg,#64d2ff 0%,#30d158 55%,#ffd60a 100%)" },
  teksi: { bg: "linear-gradient(160deg,#fcd34d 0%,#f59e0b 45%,#d8352a 100%)" },
};

/**
 * In-city handset: a small standard smartphone docks on the right so the city and
 * character stay visible. No flip/fold — just a slab phone.
 */
export function Phone({
  open,
  onClose,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  onToast?: (text: string) => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const auth = useAuth();
  useProfile(); // re-render on inbox changes (unread badge)
  const [app, setApp] = useState<AppId>("home");
  const [clock, setClock] = useState("9:41");

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const d = new Date();
      setClock(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    setApp("home");
    onClose();
  };
  const subtitle = getAuth().username ? `@${getAuth().username}` : `${HUB.name} · v${HUB.version}`;
  const unread = unreadInboxCount();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-end"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Tap empty city to put the phone away — no heavy modal dim */}
      <button type="button" className="pointer-events-auto absolute inset-0 bg-transparent" aria-label={tr.close} onClick={dismiss} />
      <div className="safe-pr pointer-events-auto relative z-10 flex h-full items-center py-3 pl-2">
        <PhoneShell wallpaper={app === "home"}>
          <StatusBar clock={clock} dark={app !== "home"} />
          {app !== "home" && <NavBar title={titleOf(app, tr)} back={tr.phone} onBack={() => setApp("home")} />}
          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
              app === "home" ? "px-3.5 pt-3" : "bg-[#f2f2f7]"
            }`}
          >
            {app === "home" ? (
              <HomeScreen tr={tr} unread={unread} onOpen={setApp} subtitle={subtitle} />
            ) : (
              <>
                {app === "mesej" && <Mesej lang={lang} />}
                {app === "profil" && <Profil lang={lang} auth={auth} />}
                {app === "dompet" && <Dompet lang={lang} />}
                {app === "tetapan" && <Tetapan lang={lang} auth={auth} />}
                {app === "teksi" && (
                  <Teksi
                    lang={lang}
                    onClosePhone={dismiss}
                    onToast={onToast}
                  />
                )}
              </>
            )}
          </div>
          <HomeBar dark={app !== "home"} label={app === "home" ? tr.close : tr.phone} onClick={app === "home" ? dismiss : () => setApp("home")} />
        </PhoneShell>
      </div>
    </div>
  );
}

function titleOf(app: AppId, tr: (typeof HUB_STRINGS)["ms"]) {
  if (app === "mesej") return tr.appMesej;
  if (app === "profil") return tr.appProfil;
  if (app === "dompet") return tr.appDompet;
  if (app === "teksi") return tr.appTeksi;
  return tr.appTetapan;
}

const WALLPAPER = "bg-[radial-gradient(130%_90%_at_10%_-10%,#ff8a5c_0%,#e14bff_38%,#4b6dff_72%,#0b1224_100%)]";

/** Standard slab smartphone — right dock, ~9∶19.5, smaller than the old foldable. */
function PhoneShell({ children, wallpaper }: { children: ReactNode; wallpaper: boolean }) {
  return (
    <div
      className="phone-rise relative shrink-0"
      style={{
        width: "min(260px, 36vw, calc((100dvh - 32px) * 9 / 19.5))",
        height: "min(560px, calc(100dvh - 32px), calc(36vw * 19.5 / 9))",
      }}
    >
      <div className="relative box-border h-full w-full rounded-[2rem] bg-[#1a1a1e] p-[7px] shadow-[0_18px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
        {/* Side buttons */}
        <span className="pointer-events-none absolute top-[18%] -left-[3px] h-[8%] w-[3px] rounded-l bg-[#2e2e34]" />
        <span className="pointer-events-none absolute top-[28%] -left-[3px] h-[12%] w-[3px] rounded-l bg-[#2e2e34]" />
        <span className="pointer-events-none absolute top-[24%] -right-[3px] h-[14%] w-[3px] rounded-r bg-[#2e2e34]" />
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.55rem] bg-[#f2f2f7]">
          {wallpaper && <div className={`absolute inset-0 ${WALLPAPER}`} />}
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ clock, dark }: { clock: string; dark: boolean }) {
  return (
    <div
      className={`relative z-30 flex shrink-0 items-end justify-between px-4 pt-2.5 pb-0.5 text-[12px] font-semibold tracking-tight ${
        dark ? "bg-[#f2f2f7] text-black" : "text-white"
      }`}
    >
      <span className="min-w-[44px] tabular-nums">{clock}</span>
      {/* Punch-hole camera */}
      <span className="absolute top-2.5 left-1/2 size-[11px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)]" />
      <div className="flex min-w-[44px] items-center justify-end gap-1 text-[10px]">
        <SignalBars dark={dark} />
        <span className="opacity-90">5G</span>
        <Battery dark={dark} />
      </div>
    </div>
  );
}

function NavBar({ title, back, onBack }: { title: string; back?: string; onBack?: () => void }) {
  return (
    <div className="relative z-30 flex shrink-0 items-center border-b border-black/6 bg-[#f2f2f7]/92 px-0.5 pt-0.5 pb-1 backdrop-blur-xl">
      {onBack ? (
        <button type="button" onClick={onBack} className="relative z-10 flex min-h-8 min-w-[64px] items-center gap-0.5 rounded-lg px-1.5 py-1 text-[13px] font-normal text-[#007aff] active:opacity-60">
          <ChevronLeft />
          <span>{back}</span>
        </button>
      ) : (
        <span className="min-h-8 min-w-[64px]" />
      )}
      <p className="pointer-events-none absolute inset-x-0 text-center text-[13px] font-semibold text-black">{title}</p>
      <span className="min-w-[64px]" aria-hidden />
    </div>
  );
}

function HomeBar({ dark, label, onClick }: { dark: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative z-30 flex shrink-0 justify-center pt-1 pb-1.5 ${dark ? "bg-[#f2f2f7]" : "bg-transparent"}`}
    >
      <span className={`h-[4px] w-[100px] max-w-[40%] rounded-full ${dark ? "bg-black/30" : "bg-white/60"}`} />
    </button>
  );
}

function HomeScreen({
  tr,
  unread,
  onOpen,
  subtitle,
}: {
  tr: (typeof HUB_STRINGS)["ms"];
  unread: number;
  onOpen: (id: AppId) => void;
  subtitle: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 text-center">
        <p className="text-[11px] font-medium tracking-wide text-white/75 drop-shadow-sm">{subtitle}</p>
      </div>

      <div className="grid grid-cols-4 gap-x-1 gap-y-4 px-0.5">
        <IosIcon kind="mesej" label={tr.appMesej} badge={unread} onClick={() => onOpen("mesej")} />
        <IosIcon kind="profil" label={tr.appProfil} onClick={() => onOpen("profil")} />
        <IosIcon kind="dompet" label={tr.appDompet} onClick={() => onOpen("dompet")} />
        <IosIcon kind="tetapan" label={tr.appTetapan} onClick={() => onOpen("tetapan")} />
        <IosIcon kind="teksi" label={tr.appTeksi} onClick={() => onOpen("teksi")} />
        <IosIcon kind="kerja" label={tr.appKerja} soon />
      </div>

      <div className="mt-auto mb-0.5 rounded-[22px] border border-white/25 bg-white/20 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
        <div className="grid grid-cols-4 place-items-center gap-0.5">
          <DockIcon kind="mesej" onClick={() => onOpen("mesej")} badge={unread} />
          <DockIcon kind="profil" onClick={() => onOpen("profil")} />
          <DockIcon kind="dompet" onClick={() => onOpen("dompet")} />
          <DockIcon kind="tetapan" onClick={() => onOpen("tetapan")} />
        </div>
      </div>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  const label = n > 99 ? "99+" : String(n);
  return (
    <span className="pointer-events-none absolute -top-1 -right-1 z-10 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-[#ff3b30] px-1 text-[9px] leading-none font-bold text-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] ring-2 ring-white/90">
      {label}
    </span>
  );
}

function IosIcon({
  kind,
  label,
  badge,
  soon,
  onClick,
}: {
  kind: IconKind;
  label: string;
  badge?: number;
  soon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={soon}
      onClick={onClick}
      className="relative flex w-full flex-col items-center gap-1.5 disabled:opacity-45 active:scale-95"
    >
      {/* Square tile — % of column so it never squashes when the shell scales */}
      <span className="relative aspect-square w-[min(48px,100%)]">
        <span
          className="absolute inset-0 grid place-items-center overflow-hidden rounded-[22%] shadow-[0_10px_24px_rgba(0,0,0,0.28)] ring-1 ring-white/25"
          style={{ background: APP_ICON[kind].bg }}
        >
          <AppGlyph kind={kind} />
        </span>
        <Badge n={badge ?? 0} />
        {soon && (
          <span className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white/95 uppercase">
            soon
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{label}</span>
    </button>
  );
}

function DockIcon({ kind, onClick, badge }: { kind: IconKind; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick} className="relative aspect-square w-[min(42px,100%)] active:scale-95">
      <span
        className="absolute inset-0 grid place-items-center overflow-hidden rounded-[22%] shadow-[0_4px_12px_rgba(0,0,0,0.2)] ring-1 ring-white/30"
        style={{ background: APP_ICON[kind].bg }}
      >
        <AppGlyph kind={kind} size={22} />
      </span>
      <Badge n={badge ?? 0} />
    </button>
  );
}

/** Flat white glyphs, Apple-home-screen style (no emoji). */
function AppGlyph({ kind, size = 24 }: { kind: IconKind; size?: number }) {
  const s = size;
  if (kind === "mesej") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 5.5c-6.2 0-11.2 4.2-11.2 9.4 0 3.2 1.9 6 4.8 7.7v3.4l3.6-2c.9.2 1.8.3 2.8.3 6.2 0 11.2-4.2 11.2-9.4S22.2 5.5 16 5.5Z"
          fill="white"
        />
        <circle cx="10.8" cy="14.8" r="1.3" fill="#0a84ff" />
        <circle cx="16" cy="14.8" r="1.3" fill="#0a84ff" />
        <circle cx="21.2" cy="14.8" r="1.3" fill="#0a84ff" />
      </svg>
    );
  }
  if (kind === "tugasan") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="7" y="6" width="18" height="20" rx="3" fill="white" />
        <path d="M11.5 12.2h9" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" />
        <path d="M11.5 16.5h9" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" />
        <path d="M11.5 20.8h6" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22.5" cy="9.5" r="4.2" fill="#ff453a" />
        <path d="M20.6 9.5l1.2 1.2 2.4-2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "profil") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="12" r="5.2" fill="white" />
        <path d="M6.5 26c1.8-5.2 5.2-7.8 9.5-7.8S25.2 20.8 27 26" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "dompet") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="5.5" y="9" width="21" height="15" rx="3.5" fill="white" />
        <rect x="5.5" y="9" width="21" height="4.5" rx="2" fill="white" opacity="0.85" />
        <path d="M5.5 13.5h21" stroke="#248a3d" strokeWidth="1.2" opacity="0.25" />
        <circle cx="22.2" cy="18.8" r="2.2" fill="#30d158" />
        <rect x="8.5" y="7" width="12" height="3.2" rx="1.2" fill="white" opacity="0.7" />
      </svg>
    );
  }
  if (kind === "tetapan") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          fill="white"
          d="M13.1 4.8h5.8l.5 2.6a8.8 8.8 0 0 1 2.1 1.2l2.5-1.1 2.9 2.9-1.1 2.5c.5.7.9 1.4 1.2 2.1l2.6.5v5.8l-2.6.5a8.8 8.8 0 0 1-1.2 2.1l1.1 2.5-2.9 2.9-2.5-1.1a8.8 8.8 0 0 1-2.1 1.2l-.5 2.6h-5.8l-.5-2.6a8.8 8.8 0 0 1-2.1-1.2l-2.5 1.1-2.9-2.9 1.1-2.5a8.8 8.8 0 0 1-1.2-2.1L4.8 18.9v-5.8l2.6-.5c.3-.7.7-1.4 1.2-2.1L7.5 7.9l2.9-2.9 2.5 1.1c.7-.5 1.4-.9 2.1-1.2l.1-2.1Zm2.9 7.4a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"
        />
      </svg>
    );
  }
  if (kind === "kerja") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="6" y="12" width="20" height="13" rx="3" fill="white" />
        <path d="M12 12V10.5A2.5 2.5 0 0 1 14.5 8h3A2.5 2.5 0 0 1 20 10.5V12" stroke="white" strokeWidth="2.2" />
        <path d="M6 16.5h20" stroke="#5e5ce6" strokeWidth="1.5" opacity="0.35" />
        <rect x="14" y="17.5" width="4" height="2.5" rx="1" fill="#5e5ce6" />
      </svg>
    );
  }
  if (kind === "teksi") {
    return (
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="5" y="14" width="22" height="9" rx="2.2" fill="white" />
        <path d="M9 14l2.2-4.2h9.6L23 14" stroke="white" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="10.5" cy="23.2" r="2.1" fill="white" />
        <circle cx="21.5" cy="23.2" r="2.1" fill="white" />
        <rect x="12.5" y="9.2" width="7" height="2.2" rx="0.6" fill="white" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M8 22.5l4.2-10.5L16 18l3.2-5.5L24 22.5H8Z" fill="white" />
      <circle cx="22" cy="10.5" r="2.4" fill="white" />
      <path d="M7.5 24h17" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function Mesej({ lang }: { lang: "ms" | "en" }) {
  const p = useProfile();
  const tr = HUB_STRINGS[lang];
  if (!p.inbox.length) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
        <span className="mb-2 grid size-11 place-items-center rounded-[12px] bg-gradient-to-br from-[#64d2ff] to-[#0a84ff] shadow-md">
          <AppGlyph kind="mesej" size={24} />
        </span>
        <p className="text-[14px] font-semibold text-black">{tr.appMesej}</p>
        <p className="mt-0.5 text-[12px] text-[#8e8e93]">{tr.inboxEmpty}</p>
      </div>
    );
  }
  return (
    <div className="min-h-full bg-[#f2f2f7] pb-3">
      <p className="px-3 pt-0.5 pb-2 text-[22px] leading-none font-bold tracking-tight text-black">{tr.appMesej}</p>
      <div className="mx-2 overflow-hidden rounded-[12px] bg-white shadow-sm">
        {p.inbox.map((m, i) => {
          const who = m.from === "kak-yati" ? "Kak Yati" : m.from.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const initial = who.slice(0, 1).toUpperCase();
          return (
            <div key={m.id} className={`flex gap-2 px-2.5 py-2.5 ${i > 0 ? "border-t border-black/5" : ""}`}>
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#64d2ff] to-[#0a84ff] text-[12px] font-semibold text-white shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1.5">
                  <p className={`truncate text-[13px] ${m.read ? "font-semibold text-black" : "font-bold text-black"}`}>{who}</p>
                  {!m.read && <span className="size-1.5 shrink-0 rounded-full bg-[#007aff]" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#8e8e93]">{lang === "ms" ? m.bodyMs : m.bodyEn}</p>
                {!m.read && (
                  <button
                    type="button"
                    className="mt-1.5 rounded-full bg-[#e5e5ea] px-2.5 py-1 text-[11px] font-semibold text-[#007aff] active:opacity-70"
                    onClick={() => markInboxRead(m.id)}
                  >
                    {tr.markRead}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Profil({ lang, auth }: { lang: "ms" | "en"; auth: ReturnType<typeof useAuth> }) {
  const p = useProfile();
  const tr = HUB_STRINGS[lang];
  const into = p.xp % XP_PER_LEVEL;
  const pct = Math.min(100, (into / XP_PER_LEVEL) * 100);
  const handle = auth.username ? `@${auth.username}` : "—";

  return (
    <div className="flex min-h-full flex-col bg-[#f2f2f7] px-2 pb-3">
      <p className="px-1.5 pt-0.5 pb-2 text-[22px] leading-none font-bold tracking-tight text-black">{tr.appProfil}</p>

      <div className="mb-3 overflow-hidden rounded-[14px] bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#ee5a24] p-3.5 text-white shadow-md">
        <p className="text-[12px] font-semibold tracking-tight">{handle}</p>
        <p className="mt-2.5 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{tr.level(p.level)}</p>
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[10px] text-white/65">
            <span>{tr.profilXp}</span>
            <span className="tabular-nums">
              {into}/{XP_PER_LEVEL}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-amber-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <p className="mb-1 px-2.5 text-[10px] tracking-wide text-[#8e8e93] uppercase">{tr.profilLevel}</p>
      <div className="overflow-hidden rounded-[12px] bg-white shadow-sm">
        <SettingsRow label={tr.wallet} trailing={<span className="text-[13px] font-semibold tabular-nums text-black">{rm(p.wallet)}</span>} />
        <SettingsRow label="XP" border trailing={<span className="text-[13px] font-semibold tabular-nums text-black">{p.xp}</span>} />
      </div>
    </div>
  );
}

function Teksi({
  lang,
  onClosePhone,
  onToast,
}: {
  lang: "ms" | "en";
  onClosePhone: () => void;
  onToast?: (text: string) => void;
}) {
  const tr = HUB_STRINGS[lang];
  const choices = taxiDestChoices(player.x, player.z);

  const order = (destId: string) => {
    if (taxiBusy() || rideBusy() || fare.riding) {
      onToast?.(tr.taxiBusy);
      return;
    }
    // Up on a station deck or inside the paid zone, the walk to the kerb would cut through the station
    if (fare.paid || floorYAt(player.x, player.z) > 0.5) {
      onToast?.(tr.taxiNotHere);
      return;
    }
    const ok = spendMoney(TAXI_FARE_SEN, "Teksi Kumar", "Kumar's taxi");
    if (!ok) {
      onToast?.(tr.needMoney);
      return;
    }
    if (!startTaxiRide(destId, player.x, player.z)) {
      addMoney(TAXI_FARE_SEN, "Teksi refund", "Taxi refund");
      onToast?.(tr.taxiBusy);
      return;
    }
    sfx.chime();
    onToast?.(tr.taxiArriving);
    onClosePhone();
  };

  return (
    <div className="flex min-h-full flex-col bg-[#f2f2f7] px-2 pb-3">
      <p className="px-1.5 pt-0.5 pb-1 text-[22px] leading-none font-bold tracking-tight text-black">{tr.taxiTitle}</p>
      <p className="mb-3 px-1.5 text-[12px] font-medium text-[#8e8e93]">{tr.taxiPickHint}</p>
      <div className="flex flex-col gap-2">
        {choices.map((d) => {
          const name = lang === "ms" ? d.nameMs : d.nameEn;
          return (
            <button
              key={d.id}
              type="button"
              className="flex items-center justify-between rounded-[12px] bg-white px-3.5 py-3 text-left shadow-sm active:scale-[0.99]"
              onClick={() => order(d.id)}
            >
              <span className="text-[15px] font-semibold text-black">{name}</span>
              <span className="text-[13px] font-semibold tabular-nums text-[#d8352a]">{tr.taxiFare}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Dompet({ lang }: { lang: "ms" | "en" }) {
  const p = useProfile();
  const tr = HUB_STRINGS[lang];
  return (
    <div className="flex min-h-full flex-col bg-[#f2f2f7] px-2 pb-3">
      <p className="px-1.5 pt-0.5 pb-2 text-[22px] leading-none font-bold tracking-tight text-black">{tr.appDompet}</p>

      <div className="mb-3 overflow-hidden rounded-[14px] bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#0a84ff] p-3.5 text-white shadow-md">
        <p className="text-[10px] font-medium tracking-[0.08em] text-white/70 uppercase">{tr.wallet}</p>
        <p className="mt-2 text-[26px] leading-none font-semibold tracking-tight tabular-nums">{rm(p.wallet)}</p>
        <p className="mt-2.5 text-[10px] text-white/55">Kuala Lepak · Touch n Lepak</p>
      </div>

      <p className="mb-1 px-2.5 text-[10px] tracking-wide text-[#8e8e93] uppercase">Activity</p>
      <div className="overflow-hidden rounded-[12px] bg-white shadow-sm">
        {p.ledger.length === 0 && <p className="px-3 py-4 text-[12px] text-[#8e8e93]">{tr.noLedger}</p>}
        {p.ledger.map((e, i) => (
          <div key={e.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 ${i > 0 ? "border-t border-black/5" : ""}`}>
            <p className="min-w-0 truncate text-[12px] font-medium text-black">{lang === "ms" ? e.labelMs : e.labelEn}</p>
            <p className={`shrink-0 text-[12px] font-semibold tabular-nums ${e.amount >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
              {e.amount >= 0 ? "+" : ""}
              {rm(e.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tetapan({ lang, auth }: { lang: "ms" | "en"; auth: ReturnType<typeof useAuth> }) {
  const tr = HUB_STRINGS[lang];
  const muted = useMuted();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      if (mode === "register") await registerAccount(username, pin);
      else await loginAccount(username, pin);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#f2f2f7] px-2 pb-4">
      <p className="px-1.5 pt-0.5 pb-2 text-[22px] leading-none font-bold tracking-tight text-black">{tr.appTetapan}</p>

      <p className="mb-1 px-2.5 text-[10px] tracking-wide text-[#8e8e93] uppercase">General</p>
      <div className="mb-3 overflow-hidden rounded-[12px] bg-white shadow-sm">
        <SettingsRow
          label="Language / Bahasa"
          trailing={
            <div className="flex overflow-hidden rounded-full bg-[#e5e5ea] p-0.5 text-[10px] font-semibold">
              {(["ms", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-full px-2 py-0.5 ${lang === l ? "bg-white text-black shadow-sm" : "text-[#8e8e93]"}`}
                >
                  {l === "ms" ? "BM" : "EN"}
                </button>
              ))}
            </div>
          }
        />
        <SettingsRow
          label="Sound"
          border
          trailing={
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className={`relative h-[24px] w-[40px] rounded-full transition ${muted ? "bg-[#e5e5ea]" : "bg-[#34c759]"}`}
            >
              <span className={`absolute top-[2px] size-[20px] rounded-full bg-white shadow transition ${muted ? "left-[2px]" : "left-[18px]"}`} />
            </button>
          }
        />
      </div>

      <p className="mb-1 px-2.5 text-[10px] tracking-wide text-[#8e8e93] uppercase">{tr.cloudAccount}</p>
      <div className="mb-3 overflow-hidden rounded-[12px] bg-white shadow-sm">
        {auth.username ? (
          <>
            <SettingsRow label="Signed in" trailing={<span className="max-w-[7rem] truncate text-[12px] text-[#8e8e93]">@{auth.username}</span>} />
            <button
              type="button"
              className="w-full border-t border-black/5 px-3 py-2.5 text-left text-[13px] text-[#ff3b30] active:bg-black/5"
              onClick={() => void logoutAccount()}
            >
              {tr.logout}
            </button>
          </>
        ) : (
          <div className="space-y-2 p-3">
            <div className="flex gap-1.5">
              {(["register", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${mode === m ? "bg-[#007aff] text-white" : "bg-[#e5e5ea] text-black"}`}
                >
                  {m === "register" ? tr.register : tr.login}
                </button>
              ))}
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-[8px] bg-[#e5e5ea] px-2.5 py-2 text-[13px] text-black outline-none placeholder:text-[#8e8e93]"
              autoComplete="username"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN · 6 digits"
              inputMode="numeric"
              className="w-full rounded-[8px] bg-[#e5e5ea] px-2.5 py-2 text-[13px] text-black outline-none placeholder:text-[#8e8e93]"
              autoComplete="current-password"
            />
            {err && <p className="text-[11px] text-[#ff3b30]">{err}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-[10px] bg-[#007aff] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {mode === "register" ? tr.register : tr.login}
            </button>
            <p className="text-[10px] leading-snug text-[#8e8e93]">{tr.authHint}</p>
          </div>
        )}
      </div>

      <p className="mt-auto px-1.5 pt-2 text-center text-[10px] text-[#8e8e93]">
        {HUB.name} v{HUB.version}
        <br />
        {tr.madeIn}
      </p>
    </div>
  );
}

function SettingsRow({ label, trailing, border }: { label: string; trailing?: ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2.5 ${border ? "border-t border-black/5" : ""}`}>
      <p className="min-w-0 truncate text-[13px] text-black">{label}</p>
      {trailing}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="9" height="14" viewBox="0 0 12 20" fill="none" aria-hidden className="mr-0.5 shrink-0">
      <path d="M10 2L2 10l8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SignalBars({ dark }: { dark: boolean }) {
  const c = dark ? "bg-black" : "bg-white";
  return (
    <span className="flex items-end gap-[2px]">
      <span className={`h-[4px] w-[3px] rounded-[1px] ${c}`} />
      <span className={`h-[6px] w-[3px] rounded-[1px] ${c}`} />
      <span className={`h-[8px] w-[3px] rounded-[1px] ${c}`} />
      <span className={`h-[10px] w-[3px] rounded-[1px] ${c} opacity-40`} />
    </span>
  );
}

function Battery({ dark }: { dark: boolean }) {
  const border = dark ? "border-black/40" : "border-white/50";
  const fill = dark ? "bg-black" : "bg-white";
  const tip = dark ? "bg-black/40" : "bg-white/50";
  return (
    <span className="flex items-center gap-[1px]">
      <span className={`relative h-[11px] w-[22px] rounded-[3px] border ${border} p-[1px]`}>
        <span className={`block h-full w-[70%] rounded-[1px] ${fill}`} />
      </span>
      <span className={`h-[4px] w-[1.5px] rounded-r-sm ${tip}`} />
    </span>
  );
}
