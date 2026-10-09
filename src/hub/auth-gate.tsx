"use client";

import { useState } from "react";
import { enterAccount } from "@/core/auth-client";
import { LandscapeGate } from "@/shared/landscape-gate";
import { Logo } from "@/shared/logo";
import { setLang, useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";

const PIN_LEN = 6;

/** Full-screen enter — landscape layout: name left, PIN pad right. */
export function AuthGate() {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const canGo = username.length >= 5 && pin.length === PIN_LEN && !busy;

  const go = async (pinOverride?: string) => {
    const usePin = pinOverride ?? pin;
    if (username.length < 5 || usePin.length !== PIN_LEN || busy) return;
    setBusy(true);
    setErr("");
    try {
      await enterAccount(username, usePin);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const tapDigit = (d: string) => {
    if (busy || pin.length >= PIN_LEN) return;
    const next = pin + d;
    setPin(next);
    setErr("");
    if (next.length === PIN_LEN && username.length >= 5) void go(next);
  };

  const backspace = () => {
    if (busy) return;
    setPin((p) => p.slice(0, -1));
    setErr("");
  };

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#9fdcd2] select-none">
      <LandscapeGate />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.25)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#ff9a3d]/20 via-transparent to-[#2f8f4e]/25" />

      <div className="absolute top-3 right-3 z-10 flex gap-1">
        {(["ms", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-extrabold ${
              lang === l ? "bg-amber-300 text-ink" : "bg-cream/80 text-ink/60"
            }`}
          >
            {l === "ms" ? "BM" : "EN"}
          </button>
        ))}
      </div>

      <div className="safe-px relative flex max-h-dvh w-full max-w-3xl flex-row items-center gap-6 overflow-y-auto py-4 max-[700px]:max-w-md max-[700px]:flex-col">
        {/* Left: brand + username */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
          <div className="relative animate-[float_4s_ease-in-out_infinite]">
            <Logo size="lg" className="items-center max-[700px]:scale-90" />
            <span className="absolute -right-6 -bottom-2 -rotate-6 rounded-full border-[3px] border-ink bg-chili px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-[0_3px_0_#1f1a17] sm:-right-8 sm:text-xs">
              🇲🇾 {tr.brand}
            </span>
          </div>

          <div className="relative max-w-sm rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 text-center text-sm leading-snug font-bold text-ink shadow-[0_5px_0_#1f1a17]">
            <span className="absolute -top-[10px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-t-[3px] border-l-[3px] border-ink bg-cream" />
            {tr.authGateBody}
          </div>

          <label className="flex w-full max-w-sm flex-col gap-1">
            <span className="px-1 text-xs font-extrabold tracking-widest text-ink/70 uppercase">{tr.authUserLabel}</span>
            <input
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .replace(/^@+/, "")
                    .replace(/[^a-zA-Z0-9_]/g, "")
                    .slice(0, 20)
                    .toLowerCase(),
                )
              }
              placeholder={tr.authUserPlaceholder}
              className="w-full rounded-2xl border-[3px] border-ink bg-ink px-4 py-2.5 text-lg font-extrabold tracking-wide text-cream shadow-[0_5px_0_#1f1a17] outline-none placeholder:text-cream/35 focus:bg-[#2a2420]"
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={20}
              inputMode="text"
            />
          </label>

          {err && (
            <p className="animate-pop rounded-full border-2 border-ink bg-chili px-4 py-1.5 text-center text-sm font-extrabold text-white shadow-[0_3px_0_#1f1a17]">
              {err}
            </p>
          )}
          <p className="text-center text-[11px] font-bold text-ink/50">{tr.authHint}</p>
        </div>

        {/* Right: PIN pad */}
        <div className="flex w-full max-w-[280px] shrink-0 flex-col items-center gap-2">
          <p className="text-xs font-extrabold tracking-widest text-ink/70 uppercase">{tr.authPinLabel}</p>
          <div className="flex gap-1.5">
            {Array.from({ length: PIN_LEN }, (_, i) => (
              <span
                key={i}
                className={`flex size-7 items-center justify-center rounded-lg border-[3px] border-ink text-sm font-extrabold shadow-[0_2px_0_#1f1a17] sm:size-8 ${
                  i < pin.length ? "bg-amber-300 text-ink" : "bg-cream/90 text-ink/20"
                }`}
              >
                {i < pin.length ? "•" : ""}
              </span>
            ))}
          </div>

          <div className="grid w-full grid-cols-3 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "GO"].map((key) => {
              if (key === "⌫") {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={backspace}
                    disabled={busy || pin.length === 0}
                    className="rounded-2xl border-[3px] border-ink bg-cream py-2.5 text-xl font-extrabold text-ink shadow-[0_4px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_1px_0_#1f1a17] disabled:opacity-40"
                    aria-label="Backspace"
                  >
                    ⌫
                  </button>
                );
              }
              if (key === "GO") {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void go()}
                    disabled={!canGo}
                    className="rounded-2xl border-[3px] border-ink bg-chili py-2.5 text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_1px_0_#1f1a17] disabled:opacity-40"
                  >
                    {busy ? "…" : tr.authGo}
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => tapDigit(key)}
                  disabled={busy || pin.length >= PIN_LEN}
                  className="rounded-2xl border-[3px] border-ink bg-amber-300 py-2.5 text-2xl font-extrabold text-ink shadow-[0_4px_0_#1f1a17] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#1f1a17] disabled:opacity-40"
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthSplash() {
  const lang = useLang();
  return (
    <div className="relative grid h-dvh w-full place-items-center bg-[#9fdcd2]">
      <LandscapeGate />
      <p className="text-sm font-bold text-ink/60">{HUB_STRINGS[lang].loading}</p>
    </div>
  );
}
