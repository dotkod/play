"use client";

import { useSyncExternalStore } from "react";

export const PROFILE_KEY = "kuala-lepak:profile";
export const PROFILE_VERSION = 2;
export const XP_PER_LEVEL = 100;
const LEDGER_MAX = 40;
const INBOX_MAX = 40;

export type TaskProgress = { id: string; step: number };

export type LedgerEntry = {
  id: string;
  at: number;
  amount: number;
  labelMs: string;
  labelEn: string;
};

export type InboxMessage = {
  id: string;
  from: string;
  at: number;
  bodyMs: string;
  bodyEn: string;
  taskId?: string;
  read: boolean;
  accepted?: boolean;
};

export type Profile = {
  version: number;
  name: string;
  username: string;
  createdAt: number;
  updatedAt: number;
  wallet: number;
  xp: number;
  level: number;
  reputation: Record<string, number>;
  outfits: { owned: string[]; equipped: string };
  inventory: Record<string, number>;
  home: string | null;
  flags: Record<string, boolean>;
  tasks: { active: TaskProgress[]; done: string[] };
  pinnedTask: string | null;
  ledger: LedgerEntry[];
  inbox: InboxMessage[];
  stats: { catsPetted: number; shifts: Record<string, number>; distanceWalked: number; rides: number };
  position: { district: string; x: number; z: number };
  settings: { lang: "ms" | "en"; muted: boolean };
};

const listeners = new Set<() => void>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let signedIn = false;

const EMPTY: Profile = {
  version: PROFILE_VERSION,
  name: "",
  username: "",
  createdAt: 0,
  updatedAt: 0,
  wallet: 0,
  xp: 0,
  level: 1,
  reputation: {},
  outfits: { owned: ["basic"], equipped: "basic" },
  inventory: {},
  home: null,
  flags: {},
  tasks: { active: [], done: [] },
  pinnedTask: null,
  ledger: [],
  inbox: [],
  stats: { catsPetted: 0, shifts: {}, distanceWalked: 0, rides: 0 },
  position: { district: "pusat-lepak", x: 7.5, z: -4.4 },
  settings: { lang: "ms", muted: false },
};

let current: Profile | null = null;

function cloneEmpty(): Profile {
  return structuredClone(EMPTY);
}

function readLegacy(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function levelForXp(xp: number) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

function migrateFromLegacy(): Profile {
  const p = cloneEmpty();
  p.createdAt = Date.now();
  p.updatedAt = p.createdAt;
  const outfit = readLegacy("dotkod-play:outfit");
  if (outfit) {
    p.outfits.equipped = outfit;
    if (!p.outfits.owned.includes(outfit)) p.outfits.owned.push(outfit);
  }
  p.stats.catsPetted = Number(readLegacy("dotkod-play:cats-petted")) || 0;
  p.settings.lang = readLegacy("dotkod-play:lang") === "en" || readLegacy("anne-maju:lang") === "en" ? "en" : "ms";
  p.settings.muted = readLegacy("dotkod-play:muted") === "1";
  if (readLegacy("anne-maju:tutorial-done") === "1") p.flags["anne-maju:tutorial-done"] = true;
  const career = Number(readLegacy("anne-maju:career")) || 0;
  if (career > 0) p.flags["anne-maju:career-migrated"] = true;
  return p;
}

function migrateSchema(raw: Partial<Profile>): Profile {
  const p = { ...cloneEmpty(), ...raw };
  p.version = PROFILE_VERSION;
  p.username = p.username || "";
  p.reputation = { ...(p.reputation ?? {}) };
  p.outfits = {
    owned: p.outfits?.owned?.length ? [...p.outfits.owned] : ["basic"],
    equipped: p.outfits?.equipped || "basic",
  };
  p.inventory = { ...(p.inventory ?? {}) };
  p.flags = { ...(p.flags ?? {}) };
  p.tasks = { active: [...(p.tasks?.active ?? [])], done: [...(p.tasks?.done ?? [])] };
  p.pinnedTask = p.pinnedTask ?? null;
  p.ledger = [...(p.ledger ?? [])];
  p.inbox = [...(p.inbox ?? [])];
  p.stats = {
    catsPetted: p.stats?.catsPetted ?? 0,
    shifts: { ...(p.stats?.shifts ?? {}) },
    distanceWalked: p.stats?.distanceWalked ?? 0,
    rides: p.stats?.rides ?? 0,
  };
  p.position = {
    district: p.position?.district || "pusat-lepak",
    x: p.position?.x ?? 7.5,
    z: p.position?.z ?? -4.4,
  };
  p.settings = {
    lang: p.settings?.lang === "en" ? "en" : "ms",
    muted: Boolean(p.settings?.muted),
  };
  p.level = levelForXp(p.xp);
  p.updatedAt = p.updatedAt || Date.now();
  return p;
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return migrateFromLegacy();
    return migrateSchema(JSON.parse(raw) as Profile);
  } catch {
    return cloneEmpty();
  }
}

function save() {
  if (!current) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(current));
  } catch {}
}

function scheduleCloudSync() {
  if (!signedIn || typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    const p = current;
    if (!p) return;
    void fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: p }),
    }).catch(() => {});
  }, 800);
}

function notify() {
  if (current) current.updatedAt = Date.now();
  save();
  scheduleCloudSync();
  listeners.forEach((l) => l());
}

function ensure(): Profile {
  if (typeof window === "undefined") return EMPTY;
  if (!current) {
    current = load();
    save();
  }
  return current;
}

export function getProfile() {
  return ensure();
}

export function replaceProfile(next: Profile) {
  current = migrateSchema(next);
  notify();
}

export function setSignedIn(value: boolean) {
  signedIn = value;
}

function mutate(fn: (p: Profile) => void) {
  const p = ensure();
  if (p === EMPTY) return;
  const next = structuredClone(p);
  fn(next);
  current = next;
  notify();
}

function pushLedger(p: Profile, amount: number, labelMs: string, labelEn: string) {
  p.ledger.unshift({ id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), amount, labelMs, labelEn });
  if (p.ledger.length > LEDGER_MAX) p.ledger.length = LEDGER_MAX;
}

export function addMoney(sen: number, labelMs = "Wang", labelEn = "Money") {
  mutate((p) => {
    p.wallet = Math.max(0, p.wallet + sen);
    if (sen !== 0) pushLedger(p, sen, labelMs, labelEn);
  });
}

export function spendMoney(sen: number, labelMs: string, labelEn: string) {
  const p = ensure();
  if (p.wallet < sen) return false;
  addMoney(-sen, labelMs, labelEn);
  return true;
}

export function addXp(amount: number) {
  mutate((p) => {
    p.xp = Math.max(0, p.xp + amount);
    p.level = levelForXp(p.xp);
  });
}

export function setFlag(id: string, value: boolean) {
  mutate((p) => {
    p.flags[id] = value;
  });
}

export function savePosition(district: string, x: number, z: number) {
  mutate((p) => {
    p.position = { district, x, z };
  });
}

/** First enter of Kak Yati's terrace claims home; later rentables overwrite when we add them. */
export function setHome(id: string) {
  mutate((p) => {
    if (!p.home) p.home = id;
  });
}

export function addItem(id: string, count = 1) {
  mutate((p) => {
    p.inventory[id] = (p.inventory[id] ?? 0) + count;
  });
}

export function removeItem(id: string, count = 1) {
  const p = ensure();
  if ((p.inventory[id] ?? 0) < count) return false;
  mutate((next) => {
    next.inventory[id] = (next.inventory[id] ?? 0) - count;
    if (next.inventory[id] <= 0) delete next.inventory[id];
  });
  return true;
}

export function addReputation(npc: string, delta: number) {
  mutate((p) => {
    p.reputation[npc] = Math.max(0, Math.min(100, (p.reputation[npc] ?? 0) + delta));
  });
}

export function unlockOutfit(id: string) {
  mutate((p) => {
    if (!p.outfits.owned.includes(id)) p.outfits.owned.push(id);
  });
}

export function recordCatPet() {
  mutate((p) => {
    p.stats.catsPetted += 1;
  });
}

export function applyJobPayout(job: { job: string; earned: number }) {
  mutate((p) => {
    p.wallet = Math.max(0, p.wallet + job.earned);
    if (job.earned > 0) {
      p.xp += Math.max(1, Math.round(job.earned / 100));
      p.level = levelForXp(p.xp);
      pushLedger(p, job.earned, `Shift ${job.job}`, `${job.job} shift`);
    }
    p.stats.shifts[job.job] = (p.stats.shifts[job.job] ?? 0) + 1;
  });
}

export function pushInbox(msg: Omit<InboxMessage, "id" | "at" | "read"> & { id?: string; at?: number; read?: boolean }) {
  mutate((p) => {
    p.inbox.unshift({
      id: msg.id ?? `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: msg.at ?? Date.now(),
      read: msg.read ?? false,
      from: msg.from,
      bodyMs: msg.bodyMs,
      bodyEn: msg.bodyEn,
      taskId: msg.taskId,
      accepted: msg.accepted,
    });
    if (p.inbox.length > INBOX_MAX) p.inbox.length = INBOX_MAX;
  });
}

export function markInboxRead(id: string) {
  mutate((p) => {
    const m = p.inbox.find((x) => x.id === id);
    if (m) m.read = true;
  });
}

export function markInboxAccepted(id: string) {
  mutate((p) => {
    const m = p.inbox.find((x) => x.id === id);
    if (m) {
      m.accepted = true;
      m.read = true;
    }
  });
}

export function setTaskProgress(active: TaskProgress[], done: string[]) {
  mutate((p) => {
    p.tasks = { active, done };
  });
}

export function setPinnedTask(id: string | null) {
  mutate((p) => {
    p.pinnedTask = id;
  });
}

export function unreadInboxCount() {
  return ensure().inbox.filter((m) => !m.read).length;
}

export function useProfile(): Profile {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ensure(),
    () => EMPTY,
  );
}
