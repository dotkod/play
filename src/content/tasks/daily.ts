import type { Task } from "@/core/tasks/types";
import { dailyKey } from "@/games/anne-maju/progress";

const POOL: Task[] = [
  {
    id: "daily-shift",
    title: { ms: "Buat 1 shift Anne Maju", en: "Do 1 Anne Maju shift" },
    giver: "uncle-raju",
    intro: { ms: "Shift harian — datang bancuh sikit!", en: "Daily shift — come brew a bit!" },
    objectives: [{ type: "playJob", job: "anne-maju" }],
    rewards: { money: 200, xp: 15 },
    repeat: "daily",
  },
  {
    id: "daily-oyen",
    title: { ms: "Usap Oyen", en: "Pet Oyen" },
    giver: "pakcik-osman",
    intro: { ms: "Oyen tunggu kau dekat Anne Maju.", en: "Oyen's waiting near Anne Maju." },
    objectives: [{ type: "petCats", count: 1, catId: "oyen" }],
    rewards: { xp: 10, money: 100 },
    repeat: "daily",
  },
  {
    id: "daily-bus",
    title: { ms: "Singgah perhentian bas", en: "Visit the bus stop" },
    giver: "kak-yati",
    intro: { ms: "Jalan ke bus stop — rasa bandar sikit.", en: "Walk to the bus stop — feel the city a bit." },
    objectives: [{ type: "goTo", place: "bus-stop" }],
    rewards: { xp: 10 },
    repeat: "daily",
  },
  {
    id: "daily-lrt",
    title: { ms: "Naik LRT sekali", en: "Ride the LRT once" },
    giver: "kak-yati",
    intro: {
      ms: "Masuk Stesen LRT — naik Laluan Kelana ke stesen lain!",
      en: "Enter an LRT station — ride Laluan Kelana to another stop!",
    },
    objectives: [{ type: "goTo", place: "lrt-klcc" }],
    rewards: { xp: 20, money: 100 },
    repeat: "daily",
  },
  {
    id: "daily-klcc",
    title: { ms: "Jalan ke taman KLCC", en: "Visit KLCC park" },
    giver: "kak-yati",
    intro: {
      ms: "Naik bas ke KLCC atau jalan utara — tengok Menara Berkembar!",
      en: "Bus to KLCC or walk north — see Menara Berkembar!",
    },
    objectives: [{ type: "goTo", place: "klcc-park" }],
    rewards: { xp: 20, money: 100 },
    repeat: "daily",
  },
  {
    id: "daily-menara",
    title: { ms: "Naik bukit Menara Lepak", en: "Visit Menara Lepak" },
    giver: "kak-yati",
    intro: {
      ms: "Bas ke barat atau jalan — Menara Lepak tinggi betul!",
      en: "Bus west or walk — Menara Lepak is tall!",
    },
    objectives: [{ type: "goTo", place: "menara-lepak" }],
    rewards: { xp: 20, money: 100 },
    repeat: "daily",
  },
  {
    id: "daily-tlx",
    title: { ms: "Singgah TLX / Menara 106", en: "Visit TLX / Menara 106" },
    giver: "kak-yati",
    intro: {
      ms: "Bas ke TLX — Menara 106 tinggi gila!",
      en: "Bus to TLX — Menara 106 is huge!",
    },
    objectives: [{ type: "goTo", place: "tlx-tower" }],
    rewards: { xp: 20, money: 100 },
    repeat: "daily",
  },
  {
    id: "daily-stadium",
    title: { ms: "Tengok Stadium Bukit Jalan", en: "See Stadium Bukit Jalan" },
    giver: "kak-yati",
    intro: {
      ms: "Bas ke selatan — stadium besar tu!",
      en: "Bus south — check out the big stadium!",
    },
    objectives: [{ type: "goTo", place: "stadium-bukit-jalan" }],
    rewards: { xp: 20, money: 100 },
    repeat: "daily",
  },
  {
    id: "daily-pasar",
    title: { ms: "Jalan ke Pasar Besar", en: "Visit Pasar Besar" },
    giver: "kak-yati",
    intro: {
      ms: "Pasar Besar ada barang murah — pergi tengok!",
      en: "Pasar Besar has cheap stuff — go look!",
    },
    objectives: [{ type: "goTo", place: "pasar-besar" }],
    rewards: { xp: 15, money: 50 },
    repeat: "daily",
  },
  {
    id: "daily-ahseng",
    title: { ms: "Sembang dengan Uncle Ah Seng", en: "Chat with Uncle Ah Seng" },
    giver: "ah-seng",
    intro: { ms: "Mari kedai, minum air dulu.", en: "Come by the shop for a chat." },
    objectives: [{ type: "talkTo", npc: "ah-seng", dialogue: "ahseng-hello" }],
    rewards: { xp: 10, money: 50 },
    repeat: "daily",
  },
];

function hashDay(day: string) {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return h;
}

export function dailyTasksFor(now = new Date()): Task[] {
  const day = dailyKey(now);
  const h = hashDay(day);
  const picks: Task[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 3; i++) {
    let idx = (h + i * 7) % POOL.length;
    while (used.has(idx)) idx = (idx + 1) % POOL.length;
    used.add(idx);
    const base = POOL[idx];
    picks.push({ ...base, id: `${base.id}:${day}` });
  }
  return picks;
}

/** Resolve a daily task id — supports `daily-foo` and `daily-foo:YYYY-MM-DD` (keeps the id for progress keys). */
export function resolveDailyTask(id: string): Task | null {
  const today = dailyTasksFor().find((t) => t.id === id);
  if (today) return today;
  const baseId = id.includes(":") ? id.slice(0, id.indexOf(":")) : id;
  const base = POOL.find((t) => t.id === baseId);
  if (!base) return null;
  return { ...base, id };
}
