"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getAuth, loginAccount, logoutAccount, registerAccount, useAuth } from "@/core/auth-client";
import { acceptTask } from "@/core/tasks/engine";
import { taskById } from "@/core/tasks/catalog";
import {
  markInboxAccepted,
  markInboxRead,
  setPinnedTask,
  unreadInboxCount,
  useProfile,
} from "@/core/profile";
import { setMuted, useMuted } from "@/shared/audio";
import { setLang, useLang } from "@/shared/lang";
import { npcById } from "@/content/npcs";
import { HUB } from "../meta";
import { rm } from "../hud";
import { HUB_STRINGS } from "../strings";

type AppId = "home" | "mesej" | "tugasan" | "dompet" | "tetapan";
type IconKind = "mesej" | "tugasan" | "dompet" | "tetapan" | "kerja" | "peta";

const APP_ICON: Record<IconKind, { bg: string }> = {
  mesej: { bg: "linear-gradient(160deg,#64d2ff 0%,#0a84ff 55%,#0071e3 100%)" },
  tugasan: { bg: "linear-gradient(160deg,#ffd60a 0%,#ff9f0a 45%,#ff453a 100%)" },
  dompet: { bg: "linear-gradient(160deg,#30d158 0%,#34c759 40%,#248a3d 100%)" },
  tetapan: { bg: "linear-gradient(160deg,#d1d1d6 0%,#8e8e93 50%,#636366 100%)" },
  kerja: { bg: "linear-gradient(160deg,#bf5af2 0%,#5e5ce6 100%)" },
  peta: { bg: "linear-gradient(160deg,#64d2ff 0%,#30d158 55%,#ffd60a 100%)" },
};

export function Phone({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const auth = useAuth();
  const profile = useProfile();
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

  const goHome = () => setApp("home");
  const dismiss = () => {
    setApp("home");
    onClose();
  };

  const title =
    app === "home" ? null : app === "mesej" ? tr.appMesej : app === "tugasan" ? tr.appTugasan : app === "dompet" ? tr.appDompet : tr.appTetapan;

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center sm:items-center"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" }}
    >
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" aria-label={tr.close} onClick={dismiss} />

      <div className="phone-rise relative z-10 mb-0 w-full max-w-[390px] px-0 sm:mb-4 sm:px-3">
        <div className="relative mx-auto rounded-[2.75rem] bg-black p-[11px] shadow-[0_28px_90px_rgba(0,0,0,0.6)] ring-1 ring-white/20">
          {/* Side buttons (decorative) */}
          <span className="pointer-events-none absolute top-[120px] -left-[2px] h-8 w-[3px] rounded-l-sm bg-[#2a2a2c]" />
          <span className="pointer-events-none absolute top-[168px] -left-[2px] h-14 w-[3px] rounded-l-sm bg-[#2a2a2c]" />
          <span className="pointer-events-none absolute top-[230px] -left-[2px] h-14 w-[3px] rounded-l-sm bg-[#2a2a2c]" />
          <span className="pointer-events-none absolute top-[180px] -right-[2px] h-20 w-[3px] rounded-r-sm bg-[#2a2a2c]" />

          <div className="relative flex h-[min(88dvh,740px)] flex-col overflow-hidden rounded-[2.15rem] bg-black">
            <div
              className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${
                app === "home"
                  ? "bg-[radial-gradient(130%_90%_at_10%_-10%,#ff8a5c_0%,#e14bff_38%,#4b6dff_72%,#0b1224_100%)]"
                  : "bg-[#f2f2f7]"
              }`}
            >
              {/* Status bar */}
              <div
                className={`relative z-30 flex shrink-0 items-end justify-between px-7 pt-3.5 pb-1 text-[14px] font-semibold tracking-tight ${
                  app === "home" ? "text-white" : "text-black"
                }`}
              >
                <span className="min-w-[54px] tabular-nums">{clock}</span>
                <div className="absolute top-3 left-1/2 h-[30px] w-[102px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
                <div className="flex min-w-[54px] items-center justify-end gap-1.5 text-[11px]">
                  <SignalBars dark={app !== "home"} />
                  <span className="opacity-90">5G</span>
                  <Battery dark={app !== "home"} />
                </div>
              </div>

              {/* App nav — title is pointer-events-none so Back stays clickable */}
              {title && (
                <div className="relative z-30 flex shrink-0 items-center border-b border-black/6 bg-[#f2f2f7]/92 px-1 pt-0.5 pb-2 backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={goHome}
                    className="relative z-10 flex min-h-11 min-w-[88px] items-center gap-0.5 rounded-xl px-2.5 py-2 text-[17px] font-normal text-[#007aff] active:opacity-60"
                  >
                    <ChevronLeft />
                    <span>{tr.phone}</span>
                  </button>
                  <p className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold text-black">{title}</p>
                  <span className="min-w-[88px]" aria-hidden />
                </div>
              )}

              <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${app === "home" ? "px-5 pt-4" : "px-0"}`}>
                {app === "home" && (
                  <HomeScreen
                    tr={tr}
                    unread={unreadInboxCount()}
                    activeTasks={profile.tasks.active.length}
                    onOpen={setApp}
                    subtitle={getAuth().username ? `@${getAuth().username}` : `${HUB.name} · v${HUB.version}`}
                  />
                )}
                {app === "mesej" && <Mesej lang={lang} onAccepted={() => setApp("tugasan")} />}
                {app === "tugasan" && <Tugasan lang={lang} />}
                {app === "dompet" && <Dompet lang={lang} />}
                {app === "tetapan" && <Tetapan lang={lang} auth={auth} />}
              </div>

              {/* Home indicator — swipe hint; tap goes home or closes */}
              <button
                type="button"
                aria-label={app === "home" ? tr.close : tr.phone}
                onClick={app === "home" ? dismiss : goHome}
                className="relative z-30 flex shrink-0 justify-center bg-transparent pt-1.5 pb-2.5"
              >
                <span className={`h-[5px] w-[134px] rounded-full ${app === "home" ? "bg-white/60" : "bg-black/30"}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({
  tr,
  unread,
  activeTasks,
  onOpen,
  subtitle,
}: {
  tr: (typeof HUB_STRINGS)["ms"];
  unread: number;
  activeTasks: number;
  onOpen: (id: AppId) => void;
  subtitle: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 text-center">
        <p className="text-[13px] font-medium tracking-wide text-white/75 drop-shadow-sm">{subtitle}</p>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-6 px-1">
        <IosIcon kind="mesej" label={tr.appMesej} badge={unread} onClick={() => onOpen("mesej")} />
        <IosIcon kind="tugasan" label={tr.appTugasan} badge={activeTasks} onClick={() => onOpen("tugasan")} />
        <IosIcon kind="dompet" label={tr.appDompet} onClick={() => onOpen("dompet")} />
        <IosIcon kind="tetapan" label={tr.appTetapan} onClick={() => onOpen("tetapan")} />
        <IosIcon kind="kerja" label={tr.appKerja} soon />
        <IosIcon kind="peta" label={tr.appPeta} soon />
      </div>

      <div className="mt-auto mb-1 rounded-[32px] border border-white/25 bg-white/20 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
        <div className="grid grid-cols-4 gap-1">
          <DockIcon kind="mesej" onClick={() => onOpen("mesej")} badge={unread} />
          <DockIcon kind="tugasan" onClick={() => onOpen("tugasan")} badge={activeTasks} />
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
    <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 grid min-h-[20px] min-w-[20px] place-items-center rounded-full bg-[#ff3b30] px-1.5 text-[11px] leading-none font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-2 ring-white/90">
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
      className="relative flex flex-col items-center gap-1.5 disabled:opacity-45 active:scale-95"
    >
      {/* Outer shell has NO overflow so the badge can sit outside the rounded tile */}
      <span className="relative size-[62px]">
        <span
          className="absolute inset-0 grid place-items-center overflow-hidden rounded-[15px] shadow-[0_10px_24px_rgba(0,0,0,0.28)] ring-1 ring-white/25"
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
      <span className="max-w-[76px] truncate text-center text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{label}</span>
    </button>
  );
}

function DockIcon({ kind, onClick, badge }: { kind: IconKind; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick} className="relative mx-auto size-[54px] active:scale-95">
      <span
        className="absolute inset-0 grid place-items-center overflow-hidden rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] ring-1 ring-white/30"
        style={{ background: APP_ICON[kind].bg }}
      >
        <AppGlyph kind={kind} size={28} />
      </span>
      <Badge n={badge ?? 0} />
    </button>
  );
}

/** Flat white glyphs, Apple-home-screen style (no emoji). */
function AppGlyph({ kind, size = 32 }: { kind: IconKind; size?: number }) {
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
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M8 22.5l4.2-10.5L16 18l3.2-5.5L24 22.5H8Z" fill="white" />
      <circle cx="22" cy="10.5" r="2.4" fill="white" />
      <path d="M7.5 24h17" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function Mesej({ lang, onAccepted }: { lang: "ms" | "en"; onAccepted: () => void }) {
  const p = useProfile();
  const tr = HUB_STRINGS[lang];
  const [failId, setFailId] = useState<string | null>(null);
  if (!p.inbox.length) {
    return (
      <div className="flex flex-col items-center px-8 py-16 text-center">
        <span className="mb-3 grid size-16 place-items-center rounded-[18px] bg-gradient-to-br from-[#64d2ff] to-[#0a84ff] shadow-lg">
          <AppGlyph kind="mesej" size={36} />
        </span>
        <p className="text-[17px] font-semibold text-black">{tr.appMesej}</p>
        <p className="mt-1 text-[15px] text-[#8e8e93]">{tr.inboxEmpty}</p>
      </div>
    );
  }
  return (
    <div className="bg-[#f2f2f7] pb-4">
      <p className="px-5 pt-1 pb-3 text-[34px] leading-none font-bold tracking-tight text-black">{tr.appMesej}</p>
      <div className="mx-3 overflow-hidden rounded-[14px] bg-white shadow-sm">
        {p.inbox.map((m, i) => {
          const who = m.from === "kak-yati" ? "Kak Yati" : npcById(m.from)?.name[lang] ?? m.from;
          const initial = who.slice(0, 1).toUpperCase();
          const task = m.taskId ? taskById(m.taskId) : null;
          const active = m.taskId ? p.tasks.active.some((a) => a.id === m.taskId) : false;
          const done = m.taskId ? p.tasks.done.includes(m.taskId) && !task?.repeat : false;
          // Show Accept if we can still take it (also recovers stuck "accepted" with no active task)
          // Recover stuck inbox rows where accepted was set but the task never activated
          const showAccept = Boolean(m.taskId && task && !active && !done);
          return (
            <div key={m.id} className={`flex gap-3 px-3.5 py-3.5 ${i > 0 ? "border-t border-black/5" : ""}`}>
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#64d2ff] to-[#0a84ff] text-[17px] font-semibold text-white shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-[16px] ${m.read ? "font-semibold text-black" : "font-bold text-black"}`}>{who}</p>
                  {!m.read && <span className="size-2.5 shrink-0 rounded-full bg-[#007aff]" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-[#8e8e93]">{lang === "ms" ? m.bodyMs : m.bodyEn}</p>
                {(active || (m.accepted && done)) && (
                  <p className="mt-1.5 text-[12px] font-semibold text-[#34c759]">{active ? tr.taskActive : tr.taskDone}</p>
                )}
                {failId === m.id && <p className="mt-1.5 text-[12px] font-semibold text-[#ff3b30]">{tr.acceptFailed}</p>}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {!m.read && (
                    <button
                      type="button"
                      className="rounded-full bg-[#e5e5ea] px-3.5 py-1.5 text-[13px] font-semibold text-[#007aff] active:opacity-70"
                      onClick={() => markInboxRead(m.id)}
                    >
                      {tr.markRead}
                    </button>
                  )}
                  {showAccept && (
                    <button
                      type="button"
                      className="rounded-full bg-[#007aff] px-3.5 py-1.5 text-[13px] font-semibold text-white active:opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!m.taskId) return;
                        if (acceptTask(m.taskId, { pin: true })) {
                          markInboxAccepted(m.id);
                          setFailId(null);
                          onAccepted();
                        } else {
                          setFailId(m.id);
                        }
                      }}
                    >
                      {tr.acceptTask}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tugasan({ lang }: { lang: "ms" | "en" }) {
  const p = useProfile();
  const tr = HUB_STRINGS[lang];
  return (
    <div className="bg-[#f2f2f7] px-3 pb-4">
      <p className="px-2 pt-1 pb-3 text-[34px] leading-none font-bold tracking-tight text-black">{tr.appTugasan}</p>

      <p className="mb-1.5 px-4 text-[13px] font-normal tracking-wide text-[#8e8e93] uppercase">{tr.activeTasks}</p>
      <div className="mb-4 overflow-hidden rounded-[14px] bg-white shadow-sm">
        {!p.tasks.active.length && <p className="px-4 py-5 text-[15px] text-[#8e8e93]">{tr.noTasks}</p>}
        {p.tasks.active.map((a, i) => {
          const t = taskById(a.id);
          if (!t) return null;
          const obj = t.objectives[a.step];
          const pinned = p.pinnedTask === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setPinnedTask(a.id)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-black/5 ${i > 0 ? "border-t border-black/5" : ""}`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full border-2 text-[12px] font-bold ${
                  pinned ? "border-[#007aff] bg-[#007aff] text-white" : "border-[#c7c7cc] text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium text-black">{t.title[lang]}</span>
                <span className="block text-[13px] text-[#8e8e93]">
                  {a.step + 1}/{t.objectives.length}
                  {obj ? ` · ${obj.type}` : ""}
                  {pinned ? ` · ${tr.pinned}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 px-4 text-[13px] font-normal tracking-wide text-[#8e8e93] uppercase">{tr.doneTasks}</p>
      <div className="overflow-hidden rounded-[14px] bg-white shadow-sm">
        {p.tasks.done
          .slice(-8)
          .reverse()
          .map((id, i) => {
            const t = taskById(id);
            return (
              <p key={id} className={`px-4 py-3.5 text-[15px] text-[#8e8e93] line-through ${i > 0 ? "border-t border-black/5" : ""}`}>
                {t?.title[lang] ?? id}
              </p>
            );
          })}
        {!p.tasks.done.length && <p className="px-4 py-5 text-[15px] text-[#8e8e93]">—</p>}
      </div>
    </div>
  );
}

function Dompet({ lang }: { lang: "ms" | "en" }) {
  const p = useProfile();
  const tr = HUB_STRINGS[lang];
  return (
    <div className="bg-[#f2f2f7] px-3 pb-4">
      <p className="px-2 pt-1 pb-3 text-[34px] leading-none font-bold tracking-tight text-black">{tr.appDompet}</p>

      <div className="mb-4 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#0a84ff] p-5 text-white shadow-lg">
        <p className="text-[13px] font-medium tracking-[0.08em] text-white/70 uppercase">{tr.wallet}</p>
        <p className="mt-3 text-[40px] leading-none font-semibold tracking-tight tabular-nums">{rm(p.wallet)}</p>
        <p className="mt-4 text-[12px] text-white/55">Kuala Lepak · Touch n Go vibes</p>
      </div>

      <p className="mb-1.5 px-4 text-[13px] tracking-wide text-[#8e8e93] uppercase">Activity</p>
      <div className="overflow-hidden rounded-[14px] bg-white shadow-sm">
        {p.ledger.length === 0 && <p className="px-4 py-5 text-[15px] text-[#8e8e93]">{tr.noLedger}</p>}
        {p.ledger.map((e, i) => (
          <div key={e.id} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-black/5" : ""}`}>
            <p className="text-[15px] font-medium text-black">{lang === "ms" ? e.labelMs : e.labelEn}</p>
            <p className={`text-[15px] font-semibold tabular-nums ${e.amount >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
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
    <div className="bg-[#f2f2f7] px-3 pb-6">
      <p className="px-2 pt-1 pb-3 text-[34px] leading-none font-bold tracking-tight text-black">{tr.appTetapan}</p>

      <p className="mb-1.5 px-4 text-[13px] tracking-wide text-[#8e8e93] uppercase">General</p>
      <div className="mb-5 overflow-hidden rounded-[14px] bg-white shadow-sm">
        <SettingsRow
          label="Language / Bahasa"
          trailing={
            <div className="flex overflow-hidden rounded-full bg-[#e5e5ea] p-0.5 text-[12px] font-semibold">
              {(["ms", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-full px-2.5 py-1 ${lang === l ? "bg-white text-black shadow-sm" : "text-[#8e8e93]"}`}
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
              className={`relative h-[31px] w-[51px] rounded-full transition ${muted ? "bg-[#e5e5ea]" : "bg-[#34c759]"}`}
            >
              <span className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow transition ${muted ? "left-[2px]" : "left-[22px]"}`} />
            </button>
          }
        />
      </div>

      <p className="mb-1.5 px-4 text-[13px] tracking-wide text-[#8e8e93] uppercase">{tr.cloudAccount}</p>
      <div className="mb-5 overflow-hidden rounded-[14px] bg-white shadow-sm">
        {auth.username ? (
          <>
            <SettingsRow label="Signed in" trailing={<span className="text-[15px] text-[#8e8e93]">@{auth.username}</span>} />
            <button
              type="button"
              className="w-full border-t border-black/5 px-4 py-3.5 text-left text-[17px] text-[#ff3b30] active:bg-black/5"
              onClick={() => void logoutAccount()}
            >
              {tr.logout}
            </button>
          </>
        ) : (
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              {(["register", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${mode === m ? "bg-[#007aff] text-white" : "bg-[#e5e5ea] text-black"}`}
                >
                  {m === "register" ? tr.register : tr.login}
                </button>
              ))}
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-[10px] bg-[#e5e5ea] px-3 py-2.5 text-[16px] text-black outline-none placeholder:text-[#8e8e93]"
              autoComplete="username"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="PIN · 8 digits"
              inputMode="numeric"
              className="w-full rounded-[10px] bg-[#e5e5ea] px-3 py-2.5 text-[16px] text-black outline-none placeholder:text-[#8e8e93]"
              autoComplete="current-password"
            />
            {err && <p className="text-[13px] text-[#ff3b30]">{err}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-[12px] bg-[#007aff] py-3 text-[17px] font-semibold text-white disabled:opacity-50"
            >
              {mode === "register" ? tr.register : tr.login}
            </button>
            <p className="text-[12px] leading-snug text-[#8e8e93]">{tr.authHint}</p>
          </div>
        )}
      </div>

      <p className="px-2 text-center text-[12px] text-[#8e8e93]">
        {HUB.name} v{HUB.version}
        <br />
        {tr.madeIn}
      </p>
    </div>
  );
}

function SettingsRow({ label, trailing, border }: { label: string; trailing?: ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${border ? "border-t border-black/5" : ""}`}>
      <p className="text-[17px] text-black">{label}</p>
      {trailing}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden className="mr-0.5 shrink-0">
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
