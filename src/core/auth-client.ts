"use client";

import { useSyncExternalStore } from "react";
import { getProfile, replaceProfile, setSignedIn } from "./profile";

type AuthState = { username: string | null; ready: boolean };

let state: AuthState = { username: null, ready: false };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getAuth() {
  return state;
}

export async function refreshAuth() {
  try {
    const res = await fetch("/api/auth/me");
    const data = (await res.json()) as { username?: string | null };
    state = { username: data.username ?? null, ready: true };
    setSignedIn(Boolean(state.username));
    if (state.username) {
      const pr = await fetch("/api/profile");
      if (pr.ok) {
        const body = (await pr.json()) as { profile?: unknown };
        if (body.profile && typeof body.profile === "object") {
          replaceProfile(body.profile as ReturnType<typeof getProfile>);
        }
      }
    }
  } catch {
    state = { username: null, ready: true };
    setSignedIn(false);
  }
  notify();
}

export type EnterResult = { username: string; isNew: boolean };

/** Stashed for Hub: "new" → city tutorial, "back" → welcome toast. */
export const AUTH_HELLO_KEY = "kuala-lepak:auth-hello";

/** In-memory copy so React Strict Mode remounts don’t lose the greeting. */
let pendingHello: "new" | "back" | null = null;

export async function registerAccount(username: string, pin: string): Promise<EnterResult> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin, profile: getProfile() }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; username?: string };
  if (!res.ok) {
    const err = new Error(data.error || "Daftar gagal") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  state = { username: data.username ?? username, ready: true };
  setSignedIn(true);
  // Stash before notify — Hub's effect runs as soon as username updates
  stashAuthHello(true);
  notify();
  return { username: data.username ?? username, isNew: true };
}

export async function loginAccount(username: string, pin: string): Promise<EnterResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; username?: string };
  if (!res.ok) throw new Error(data.error || "Log masuk gagal");
  state = { username: data.username ?? username, ready: true };
  setSignedIn(true);
  // Before notify + profile fetch — otherwise Hub takes hello while still null
  stashAuthHello(false);
  notify();
  const pr = await fetch("/api/profile");
  if (pr.ok) {
    const body = (await pr.json()) as { profile?: unknown };
    if (body.profile && typeof body.profile === "object") {
      replaceProfile(body.profile as ReturnType<typeof getProfile>);
    }
  }
  return { username: data.username ?? username, isNew: false };
}

/** New @username → register; taken → login with same PIN. */
export async function enterAccount(username: string, pin: string): Promise<EnterResult> {
  try {
    return await registerAccount(username, pin);
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 409) return loginAccount(username, pin);
    throw e;
  }
}

export function stashAuthHello(isNew: boolean) {
  pendingHello = isNew ? "new" : "back";
  try {
    sessionStorage.setItem(AUTH_HELLO_KEY, pendingHello);
  } catch {
    /* private mode */
  }
}

export function takeAuthHello(): "new" | "back" | null {
  const mem = pendingHello;
  pendingHello = null;
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(AUTH_HELLO_KEY);
    sessionStorage.removeItem(AUTH_HELLO_KEY);
  } catch {
    /* */
  }
  const v = mem ?? stored;
  return v === "new" || v === "back" ? v : null;
}

export async function logoutAccount() {
  await fetch("/api/auth/logout", { method: "POST" });
  state = { username: null, ready: true };
  setSignedIn(false);
  notify();
}

export function useAuth() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => ({ username: null, ready: false }),
  );
}
