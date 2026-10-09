import type { Dialogue } from "@/core/dialogue/types";

export const DIALOGUES: Record<string, Dialogue> = {
  "raju-hire": {
    id: "raju-hire",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [
          { speaker: "uncle-raju", text: { ms: "Eh boss! Kau budak baru tu kan? Kak Yati cakap kau cari kerja.", en: "Eh boss! You're the new kid, right? Kak Yati said you're looking for work." }, mood: "happy" },
          { speaker: "uncle-raju", text: { ms: "Anne aku cuti hari ni. Tahu buat teh tarik?", en: "My anne is off today. Can you make teh tarik?" }, mood: "excited" },
        ],
        choices: [
          { text: { ms: "Mestilah! Boleh cuba.", en: "Of course! I'll try." }, next: "go", effects: [{ type: "addReputation", npc: "uncle-raju", delta: 5 }] },
          { text: { ms: "Err… boleh belajar?", en: "Uh… can I learn?" }, next: "learn" },
          { text: { ms: "Nanti dulu, uncle.", en: "Maybe later, uncle." }, next: "later" },
        ],
      },
      learn: {
        id: "learn",
        lines: [
          { speaker: "player", text: { ms: "Aku baru sikit… boleh tunjuk?", en: "I'm pretty new… can you show me?" }, mood: "neutral" },
          { speaker: "uncle-raju", text: { ms: "Senang je — ikut langkah kat kaunter. Salah pun okay, buat lagi.", en: "Easy — follow the steps on the counter. Wrong drink? Just remake it." }, mood: "happy" },
        ],
        choices: [
          { text: { ms: "Okay, cuba!", en: "Okay, I'll try!" }, next: "go" },
          { text: { ms: "Takut la…", en: "I'm scared…" }, next: "later" },
        ],
      },
      go: {
        id: "go",
        lines: [
          { speaker: "uncle-raju", text: { ms: "Okay boss! Masuk kedai, tekan Main. Jangan panik.", en: "Okay boss! Go inside and hit Play. Don't panic." }, mood: "happy" },
        ],
        effects: [{ type: "setFlag", id: "talked:raju-hire", value: true }],
      },
      later: {
        id: "later",
        lines: [{ speaker: "uncle-raju", text: { ms: "Okay boss, jangan lama sangat!", en: "Okay boss, don't take too long!" }, mood: "neutral" }],
      },
    },
  },
  "raju-challenge": {
    id: "raju-challenge",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [
          { speaker: "uncle-raju", text: { ms: "Not bad tadi! Kali ni cuba kutip RM15. Ada tip.", en: "Not bad earlier! This time try for RM15. There's a tip." }, mood: "excited" },
        ],
        choices: [
          { text: { ms: "Okay uncle, challenge accepted!", en: "Okay uncle, challenge accepted!" }, next: "end", effects: [{ type: "setFlag", id: "talked:raju-challenge", value: true }] },
          { text: { ms: "RM15 banyak ke?", en: "Is RM15 a lot?" }, next: "reassure" },
        ],
      },
      reassure: {
        id: "reassure",
        lines: [
          { speaker: "uncle-raju", text: { ms: "Kalau steady, sejam cukup. Teh o ais laris.", en: "If you're steady, an hour is enough. Iced tea sells." }, mood: "happy" },
        ],
        choices: [
          { text: { ms: "Okay, pergi!", en: "Okay, I'm going!" }, next: "end", effects: [{ type: "setFlag", id: "talked:raju-challenge", value: true }] },
        ],
      },
      end: {
        id: "end",
        lines: [{ speaker: "uncle-raju", text: { ms: "Pergi! Teh tarik kurang manis pun okay.", en: "Go! Even less-sweet teh tarik is fine." }, mood: "happy" }],
      },
    },
  },
  "raju-idle": {
    id: "raju-idle",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [{ speaker: "uncle-raju", text: { ms: "Boss! Ada shift nanti — atau lepak dulu?", en: "Boss! Got a shift later — or just lepak first?" }, mood: "happy" }],
        choices: [
          { text: { ms: "Lepak dulu.", en: "Lepak first." }, next: "chill" },
          { text: { ms: "Nanti aku masuk.", en: "I'll come in later." }, next: "work" },
        ],
      },
      chill: {
        id: "chill",
        lines: [{ speaker: "uncle-raju", text: { ms: "Baik. Teh o ais free kalau kau lapar sangat… jangan always.", en: "Fine. Free iced tea if you're starving… not always though." }, mood: "happy" }],
      },
      work: {
        id: "work",
        lines: [{ speaker: "uncle-raju", text: { ms: "Okay. Pintu depan open.", en: "Okay. Front door's open." }, mood: "neutral" }],
      },
    },
  },
  "kiah-delivery": {
    id: "kiah-delivery",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [
          { speaker: "makcik-kiah", text: { ms: "Adik! Mari sini kejap. Pakcik Osman kat bus stop tu tak makan lagi.", en: "Adik! Come here a sec. Pakcik Osman at the bus stop hasn't eaten." }, mood: "happy" },
          { speaker: "makcik-kiah", text: { ms: "Beli nasi lemak ni — RM1.50 je — hantar kat dia. Sambal lebih!", en: "Buy this nasi lemak — just RM1.50 — and take it to him. Extra sambal!" }, mood: "excited" },
        ],
        choices: [
          { text: { ms: "Okay makcik!", en: "Okay makcik!" }, next: "end", effects: [{ type: "setFlag", id: "talked:kiah-delivery", value: true }] },
          { text: { ms: "Berapa ringgit?", en: "How much?" }, next: "price" },
          { text: { ms: "Osman kat mana?", en: "Where's Osman?" }, next: "where" },
        ],
      },
      price: {
        id: "price",
        lines: [
          { speaker: "makcik-kiah", text: { ms: "RM1.50 je. Tekan beli kat gerai, lepas tu jalan ke bus stop.", en: "Just RM1.50. Tap buy at the stall, then walk to the bus stop." }, mood: "annoyed" },
        ],
        choices: [
          { text: { ms: "Faham!", en: "Got it!" }, next: "end", effects: [{ type: "setFlag", id: "talked:kiah-delivery", value: true }] },
        ],
      },
      where: {
        id: "where",
        lines: [
          { speaker: "makcik-kiah", text: { ms: "Kat perhentian bas — bangku oren tu. Jangan lambat, nasi dingin.", en: "At the bus stop — the orange bench. Don't be slow, rice gets cold." }, mood: "neutral" },
        ],
        choices: [
          { text: { ms: "Okay, beli dulu!", en: "Okay, buying first!" }, next: "end", effects: [{ type: "setFlag", id: "talked:kiah-delivery", value: true }] },
        ],
      },
      end: {
        id: "end",
        lines: [{ speaker: "makcik-kiah", text: { ms: "Baik. Tekan beli kat gerai makcik.", en: "Good. Tap buy at makcik's stall." }, mood: "happy" }],
      },
    },
  },
  "kiah-idle": {
    id: "kiah-idle",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [{ speaker: "makcik-kiah", text: { ms: "Nasi lemak hangat. Lapar?", en: "Hot nasi lemak. Hungry?" }, mood: "happy" }],
        choices: [
          { text: { ms: "Nanti makcik.", en: "Maybe later, makcik." }, next: "bye" },
          { text: { ms: "Wangi betul!", en: "Smells so good!" }, next: "proud" },
        ],
      },
      bye: {
        id: "bye",
        lines: [{ speaker: "makcik-kiah", text: { ms: "Jangan lupa makan.", en: "Don't forget to eat." }, mood: "neutral" }],
      },
      proud: {
        id: "proud",
        lines: [{ speaker: "makcik-kiah", text: { ms: "Sambal makcik punya recipe. Rahsia sikit.", en: "Makcik's sambal recipe. A little secret." }, mood: "excited" }],
      },
    },
  },
  "osman-cats": {
    id: "osman-cats",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [
          { speaker: "pakcik-osman", text: { ms: "Wah, nasi lemak! Terima kasih, nak.", en: "Wah, nasi lemak! Thank you, kid." }, mood: "happy" },
          { speaker: "pakcik-osman", text: { ms: "Kucing-kucing sini lapar tu. Usaplah 3 ekor, hati dia tenang.", en: "The cats around here look lonely. Pet three — they'll calm down." }, mood: "neutral" },
        ],
        choices: [
          { text: { ms: "Okay pakcik!", en: "Okay pakcik!" }, next: "tip", effects: [{ type: "setFlag", id: "talked:osman-cats", value: true }] },
          { text: { ms: "Kucing mana?", en: "Which cats?" }, next: "where", effects: [{ type: "setFlag", id: "talked:osman-cats", value: true }] },
          { text: { ms: "Aku takut kucing…", en: "I'm scared of cats…" }, next: "brave", effects: [{ type: "setFlag", id: "talked:osman-cats", value: true }] },
        ],
      },
      where: {
        id: "where",
        lines: [
          { speaker: "player", text: { ms: "Dia kat mana biasanya?", en: "Where do they usually hang out?" }, mood: "neutral" },
          { speaker: "pakcik-osman", text: { ms: "Dekat Anne Maju, tepi jalan. Oyen oren tu paling ramah.", en: "Near Anne Maju, by the road. The orange one, Oyen, is friendliest." }, mood: "happy" },
        ],
        choices: [{ text: { ms: "Okay, cari Oyen!", en: "Okay, find Oyen!" }, next: "tip" }],
      },
      brave: {
        id: "brave",
        lines: [
          { speaker: "pakcik-osman", text: { ms: "Tak apa. Usap pelan-pelan — dia suka. Cuba sekali.", en: "It's alright. Pet gently — they like it. Try once." }, mood: "happy" },
        ],
        choices: [{ text: { ms: "Cuba sikit.", en: "I'll try a little." }, next: "tip" }],
      },
      tip: {
        id: "tip",
        lines: [{ speaker: "pakcik-osman", text: { ms: "Oyen paling suka usap. Jangan takut.", en: "Oyen loves pets the most. Don't be shy." }, mood: "happy" }],
      },
    },
  },
  "osman-idle": {
    id: "osman-idle",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [{ speaker: "pakcik-osman", text: { ms: "Bas lambat hari ni. Lepak kejap sama aku?", en: "Bus is late today. Lepak with me a bit?" }, mood: "neutral" }],
        choices: [
          { text: { ms: "Okay pakcik.", en: "Sure, pakcik." }, next: "chat" },
          { text: { ms: "Aku kena jalan.", en: "I gotta go." }, next: "bye" },
        ],
      },
      chat: {
        id: "chat",
        lines: [
          { speaker: "pakcik-osman", text: { ms: "Dulu KL tak sesak macam ni. Tapi kucing masih sama.", en: "KL wasn't this crowded before. But the cats are the same." }, mood: "happy" },
        ],
        choices: [
          { text: { ms: "Betul pakcik.", en: "True, pakcik." }, next: "bye" },
          { text: { ms: "Oyen okay?", en: "Is Oyen okay?" }, next: "oyen" },
        ],
      },
      oyen: {
        id: "oyen",
        lines: [{ speaker: "pakcik-osman", text: { ms: "Oyen kenyang kalau ada orang usap. Pergi tengok dia.", en: "Oyen's happy when someone pets him. Go say hi." }, mood: "happy" }],
      },
      bye: {
        id: "bye",
        lines: [{ speaker: "pakcik-osman", text: { ms: "Hati-hati jalan.", en: "Walk carefully." }, mood: "neutral" }],
      },
    },
  },
  "ahseng-hello": {
    id: "ahseng-hello",
    start: "start",
    nodes: {
      start: {
        id: "start",
        lines: [
          { speaker: "ah-seng", text: { ms: "Oh, budak baru. Welcome to Pusat Lepak.", en: "Oh, new kid. Welcome to Pusat Lepak." }, mood: "neutral" },
          { speaker: "ah-seng", text: { ms: "Kalau nak top-up kad bas nanti, datang sini.", en: "If you need a bus card top-up later, come here." }, mood: "happy" },
        ],
        choices: [
          { text: { ms: "Okay uncle!", en: "Okay uncle!" }, next: "end", effects: [{ type: "setFlag", id: "talked:ahseng-hello", value: true }] },
          { text: { ms: "Kedai apa ni?", en: "What shop is this?" }, next: "shop" },
        ],
      },
      shop: {
        id: "shop",
        lines: [
          { speaker: "ah-seng", text: { ms: "Kedai runcit — air, kuih, top-up. Jangan malu tanya.", en: "Sundry shop — drinks, kuih, top-up. Don't be shy to ask." }, mood: "happy" },
        ],
        choices: [
          { text: { ms: "Thanks uncle!", en: "Thanks uncle!" }, next: "end", effects: [{ type: "setFlag", id: "talked:ahseng-hello", value: true }] },
        ],
      },
      end: {
        id: "end",
        lines: [{ speaker: "ah-seng", text: { ms: "Jangan lupa tutup pintu.", en: "Don't forget to close the door." }, mood: "neutral" }],
      },
    },
  },
};

export function dialogueById(id: string) {
  return DIALOGUES[id] ?? null;
}
