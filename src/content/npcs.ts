import type { Look } from "@/shared/three/look";
import { BUS_STOP, STALL } from "@/hub/colliders";
import { doorSpot, BUILDINGS } from "@/hub/world-data";
import { SENTRAL_HALL } from "@/world/districts/sentral-lepak/meta";

export type NamedNpc = {
  id: string;
  name: { ms: string; en: string };
  look: Look;
  x: number;
  z: number;
  rotY: number;
  barks: { ms: string; en: string }[];
  shop?: { item: string; price: number; labelMs: string; labelEn: string };
};

const anne = BUILDINGS.find((b) => b.id === "anne-maju")!;
const runcit = BUILDINGS.find((b) => b.id === "runcit")!;
const anneDoor = doorSpot(anne);
const runcitDoor = doorSpot(runcit);

export const NAMED_NPCS: NamedNpc[] = [
  {
    id: "uncle-raju",
    name: { ms: "Uncle Raju", en: "Uncle Raju" },
    look: { skin: "#c98d60", shirt: "#e8553f", pants: "#2a2a33", headwear: "uncle", hair: "#e9e6df", apron: "#2f8f86" },
    x: anneDoor.x - 1.8,
    z: anneDoor.z + anneDoor.facing * 0.4,
    rotY: Math.PI,
    barks: [
      { ms: "Eh boss! Order teh tarik?", en: "Eh boss! Fancy a teh tarik?" },
      { ms: "Anne cuti, kau boleh cuba shift!", en: "Anne's off — you can try a shift!" },
    ],
  },
  {
    id: "makcik-kiah",
    name: { ms: "Makcik Kiah", en: "Makcik Kiah" },
    look: { skin: "#e2ad84", shirt: "#f3b6c9", pants: "#f3b6c9", headwear: "tudung", hair: "#ffffff", dress: true, apron: "#ffffff" },
    x: STALL.x,
    z: STALL.z - 0.9,
    rotY: 0,
    barks: [
      { ms: "Nasi lemak panas weh!", en: "Hot nasi lemak!" },
      { ms: "Sambal makcik letak lebih.", en: "Extra sambal from makcik." },
    ],
    shop: { item: "nasi-lemak-bungkus", price: 150, labelMs: "Nasi lemak bungkus", labelEn: "Packed nasi lemak" },
  },
  {
    id: "pakcik-osman",
    name: { ms: "Pakcik Osman", en: "Pakcik Osman" },
    look: { skin: "#a96d47", shirt: "#e7e2d6", pants: "#5b4a3a", headwear: "uncle", hair: "#e9e6df" },
    x: BUS_STOP.x + 1.6,
    z: BUS_STOP.z + 0.4,
    rotY: Math.PI,
    barks: [
      { ms: "Bas lambat lagi…", en: "Bus is late again…" },
      { ms: "Kucing-kucing lapar tu.", en: "Those cats look hungry." },
    ],
  },
  {
    id: "ah-seng",
    name: { ms: "Uncle Ah Seng", en: "Uncle Ah Seng" },
    look: { skin: "#e2ad84", shirt: "#f2b33d", pants: "#2a2a33", headwear: "short", hair: "#1b1714" },
    x: runcitDoor.x + 1.4,
    z: runcitDoor.z + runcitDoor.facing * 0.3,
    rotY: Math.PI,
    barks: [
      { ms: "Apa nak cari?", en: "Looking for something?" },
      { ms: "Harga hari ni naik sikit.", en: "Prices went up a bit today." },
    ],
  },
  {
    id: "kumar",
    name: { ms: "Kumar", en: "Kumar" },
    look: { skin: "#c98d60", shirt: "#f0d060", pants: "#1f1a17", headwear: "short", hair: "#1b1714" },
    x: SENTRAL_HALL.x + 6,
    z: SENTRAL_HALL.z + 4,
    rotY: Math.PI,
    barks: [
      { ms: "Teksi? Saya tahu shortcut semua.", en: "Taxi? I know every shortcut." },
      { ms: "Sentral ramai orang — jaga beg kau.", en: "Sentral's busy — watch your bag." },
    ],
  },
];

export function npcById(id: string) {
  return NAMED_NPCS.find((n) => n.id === id) ?? null;
}
