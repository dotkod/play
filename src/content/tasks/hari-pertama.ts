import type { Task } from "@/core/tasks/types";

export const HARI_PERTAMA: Task[] = [
  {
    id: "hp-1-bus",
    title: { ms: "Sampai kat perhentian bas", en: "Reach the bus stop" },
    giver: "kak-yati",
    intro: {
      ms: "Dah sampai KL? Jalan dulu kat Pusat Lepak. Pergi perhentian bas, kakak nak tengok kau ok.",
      en: "Made it to KL? Walk around Pusat Lepak first. Go to the bus stop so Kakak knows you're okay.",
    },
    objectives: [{ type: "goTo", place: "bus-stop" }],
    rewards: { xp: 20, money: 200 },
    chain: "hari-pertama",
  },
  {
    id: "hp-2-raju-shift",
    title: { ms: "Cuba satu shift Anne Maju", en: "Try one Anne Maju shift" },
    giver: "uncle-raju",
    intro: {
      ms: "Kau cari kerja? Anne aku cuti. Cuba satu shift, boss.",
      en: "Looking for work? My anne is off. Try one shift, boss.",
    },
    objectives: [
      { type: "talkTo", npc: "uncle-raju", dialogue: "raju-hire" },
      { type: "playJob", job: "anne-maju" },
    ],
    rewards: { xp: 30, reputation: { "uncle-raju": 10 } },
    requires: { tasksDone: ["hp-1-bus"] },
    chain: "hari-pertama",
  },
  {
    id: "hp-3-raju-rm15",
    title: { ms: "Kutip RM15 kat Anne Maju", en: "Earn RM15 at Anne Maju" },
    giver: "uncle-raju",
    intro: {
      ms: "Not bad! Esok datang lagi — kutip RM15 boleh? Ada tip sikit.",
      en: "Not bad! Come again — can you pull RM15? There's a tip in it.",
    },
    objectives: [
      { type: "talkTo", npc: "uncle-raju", dialogue: "raju-challenge" },
      { type: "playJob", job: "anne-maju", minEarned: 1500 },
    ],
    rewards: { money: 1000, xp: 50, outfit: "apron", reputation: { "uncle-raju": 15 } },
    requires: { tasksDone: ["hp-2-raju-shift"] },
    chain: "hari-pertama",
  },
  {
    id: "hp-4-nasi-lemak",
    title: { ms: "Hantar nasi lemak Makcik Kiah", en: "Deliver Makcik Kiah's nasi lemak" },
    giver: "makcik-kiah",
    intro: {
      ms: "Adik, tolong beli nasi lemak ni dan hantar kat Pakcik Osman kat bus stop. Sambal lebih!",
      en: "Adik, buy this nasi lemak and take it to Pakcik Osman at the bus stop. Extra sambal!",
    },
    objectives: [
      { type: "talkTo", npc: "makcik-kiah", dialogue: "kiah-delivery" },
      { type: "buy", item: "nasi-lemak-bungkus", count: 1, at: "nasi-lemak-stall" },
      { type: "give", item: "nasi-lemak-bungkus", npc: "pakcik-osman" },
    ],
    rewards: { money: 300, xp: 40, reputation: { "makcik-kiah": 10, "pakcik-osman": 10 } },
    requires: { tasksDone: ["hp-3-raju-rm15"] },
    chain: "hari-pertama",
  },
  {
    id: "hp-5-cats",
    title: { ms: "Usap 3 ekor kucing", en: "Pet 3 cats" },
    giver: "pakcik-osman",
    intro: {
      ms: "Terima kasih, nak. Kucing-kucing sini lapar tu — usaplah sikit, 3 ekor.",
      en: "Thanks, kid. The street cats look lonely — pet three of them for me.",
    },
    objectives: [
      { type: "talkTo", npc: "pakcik-osman", dialogue: "osman-cats" },
      { type: "petCats", count: 3 },
    ],
    rewards: { xp: 40, money: 200, reputation: { "pakcik-osman": 10 } },
    requires: { tasksDone: ["hp-4-nasi-lemak"] },
    chain: "hari-pertama",
  },
  {
    id: "hp-6-home",
    title: { ms: "Pulang ke Taman Ceria", en: "Head home to Taman Ceria" },
    giver: "kak-yati",
    intro: {
      ms: "Bas ke Taman Ceria dah ready! Naik bas (atau jalan), masuk rumah kau, duduk sofa atau tidur sekejap — rehat sikit.",
      en: "The bus to Taman Ceria is ready! Take the bus (or walk), go inside your home, sit on the sofa or nap — rest a bit.",
    },
    objectives: [
      { type: "goTo", place: "taman-ceria-home" },
      { type: "sit", place: "taman-ceria-home" },
    ],
    rewards: { xp: 50, money: 500 },
    requires: { tasksDone: ["hp-5-cats"] },
    chain: "hari-pertama",
  },
];
