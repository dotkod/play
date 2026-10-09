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

export async function registerAccount(username: string, pin: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin, profile: getProfile() }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; username?: string };
  if (!res.ok) throw new Error(data.error || "Daftar gagal");
  state = { username: data.username ?? username, ready: true };
  setSignedIn(true);
  notify();
  return data.username;
}

export async function loginAccount(username: string, pin: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, pin }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; username?: string };
  if (!res.ok) throw new Error(data.error || "Log masuk gagal");
  state = { username: data.username ?? username, ready: true };
  setSignedIn(true);
  notify();
  const pr = await fetch("/api/profile");
  if (pr.ok) {
    const body = (await pr.json()) as { profile?: unknown };
    if (body.profile && typeof body.profile === "object") {
      replaceProfile(body.profile as ReturnType<typeof getProfile>);
    }
  }
  return data.username;
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
