import { ALL_RAIL_STATIONS } from "@/content/transit";
import { BUS_STOP, STALL } from "@/hub/colliders";
import { BUILDINGS, doorSpot } from "@/hub/world-data";
import { BINTIK_BUS_STOP, BINTIK_STRIP } from "@/world/districts/bukit-bintik/meta";
import { JALAN_BUS_STOP, STADIUM_GATE } from "@/world/districts/bukit-jalan/meta";
import { KAMPUNG_BUS_STOP, KAMPUNG_ENTRANCE } from "@/world/districts/kampung-lepak/meta";
import { KLCC_BUS_STOP, KLCC_FOUNTAIN } from "@/world/districts/klcc/meta";
import { MENARA_BUS_STOP, TOWER_POS } from "@/world/districts/menara-lepak/meta";
import { PASAR_BUS_STOP, PASAR_HALL } from "@/world/districts/pasar-besar/meta";
import { PETALING_BUS_STOP, PETALING_STREET } from "@/world/districts/petaling-lane/meta";
import { SENTRAL_BUS_STOP, SENTRAL_HALL, SENTRAL_HALL_SIZE } from "@/world/districts/sentral-lepak/meta";
import { TAMAN_BUS_STOP, TAMAN_HOME_DOOR } from "@/world/districts/taman-ceria/meta";
import { MENARA_106, TLX_BUS_STOP } from "@/world/districts/tlx/meta";

export type Place = { id: string; x: number; z: number; label: { ms: string; en: string } };

export const PLACES: Place[] = [
  { id: "bus-stop", x: BUS_STOP.x, z: BUS_STOP.z, label: { ms: "Perhentian bas", en: "Bus stop" } },
  { id: "nasi-lemak-stall", x: STALL.x, z: STALL.z - 1.2, label: { ms: "Gerai nasi lemak", en: "Nasi lemak stall" } },
  ...ALL_RAIL_STATIONS.map((s) => {
    const kind = s.place.startsWith("mrt") ? "MRT" : s.place.startsWith("mono") ? "Monorel" : "LRT";
    return {
      id: s.place,
      x: s.x,
      z: s.z,
      label: { ms: `Stesen ${kind} ${s.label.ms}`, en: `${kind} ${s.label.en}` },
    };
  }),
  {
    id: "taman-ceria-bus",
    x: TAMAN_BUS_STOP.x,
    z: TAMAN_BUS_STOP.z,
    label: { ms: "Bas Taman Ceria", en: "Taman Ceria bus stop" },
  },
  {
    id: "taman-ceria-home",
    x: TAMAN_HOME_DOOR.x,
    z: TAMAN_HOME_DOOR.z,
    label: { ms: "Rumah Kak Yati", en: "Kak Yati's house" },
  },
  {
    id: "klcc-bus",
    x: KLCC_BUS_STOP.x,
    z: KLCC_BUS_STOP.z,
    label: { ms: "Bas KLCC", en: "KLCC bus stop" },
  },
  {
    id: "klcc-park",
    x: KLCC_FOUNTAIN.x,
    z: KLCC_FOUNTAIN.z,
    label: { ms: "Taman KLCC", en: "KLCC park" },
  },
  {
    id: "menara-lepak-bus",
    x: MENARA_BUS_STOP.x,
    z: MENARA_BUS_STOP.z,
    label: { ms: "Bas Menara Lepak", en: "Menara Lepak bus stop" },
  },
  {
    id: "menara-lepak",
    x: TOWER_POS.x + 8,
    z: TOWER_POS.z + 10,
    label: { ms: "Menara Lepak", en: "Menara Lepak" },
  },
  {
    id: "tlx-bus",
    x: TLX_BUS_STOP.x,
    z: TLX_BUS_STOP.z,
    label: { ms: "Bas TLX", en: "TLX bus stop" },
  },
  {
    id: "tlx-tower",
    x: MENARA_106.x,
    z: MENARA_106.z + 8,
    label: { ms: "Menara 106", en: "Menara 106" },
  },
  {
    id: "bukit-bintik-bus",
    x: BINTIK_BUS_STOP.x,
    z: BINTIK_BUS_STOP.z,
    label: { ms: "Bas Bukit Bintik", en: "Bukit Bintik bus stop" },
  },
  {
    id: "bukit-bintik",
    x: BINTIK_STRIP.x,
    z: BINTIK_STRIP.z,
    label: { ms: "Bukit Bintik", en: "Bukit Bintik" },
  },
  {
    id: "bukit-jalan-bus",
    x: JALAN_BUS_STOP.x,
    z: JALAN_BUS_STOP.z,
    label: { ms: "Bas Bukit Jalan", en: "Bukit Jalan bus stop" },
  },
  {
    id: "stadium-bukit-jalan",
    x: STADIUM_GATE.x,
    z: STADIUM_GATE.z,
    label: { ms: "Stadium Bukit Jalan", en: "Stadium Bukit Jalan" },
  },
  {
    id: "kampung-lepak-bus",
    x: KAMPUNG_BUS_STOP.x,
    z: KAMPUNG_BUS_STOP.z,
    label: { ms: "Bas Kampung Lepak", en: "Kampung Lepak bus stop" },
  },
  {
    id: "kampung-lepak",
    x: KAMPUNG_ENTRANCE.x,
    z: KAMPUNG_ENTRANCE.z,
    label: { ms: "Kampung Lepak", en: "Kampung Lepak" },
  },
  {
    id: "pasar-besar-bus",
    x: PASAR_BUS_STOP.x,
    z: PASAR_BUS_STOP.z,
    label: { ms: "Bas Pasar Besar", en: "Pasar Besar bus stop" },
  },
  {
    id: "pasar-besar",
    x: PASAR_HALL.x - 6,
    z: PASAR_HALL.z,
    label: { ms: "Pasar Besar", en: "Pasar Besar" },
  },
  {
    id: "petaling-lane-bus",
    x: PETALING_BUS_STOP.x,
    z: PETALING_BUS_STOP.z,
    label: { ms: "Bas Petaling Lane", en: "Petaling Lane bus stop" },
  },
  {
    id: "petaling-lane",
    x: PETALING_STREET.x,
    z: PETALING_STREET.z,
    label: { ms: "Petaling Lane", en: "Petaling Lane" },
  },
  {
    id: "sentral-lepak-bus",
    x: SENTRAL_BUS_STOP.x,
    z: SENTRAL_BUS_STOP.z,
    label: { ms: "Bas Sentral Lepak", en: "Sentral Lepak bus stop" },
  },
  {
    id: "sentral-lepak",
    // Hall entrance at the end of the Sentral spur
    x: -40,
    z: SENTRAL_HALL.z + SENTRAL_HALL_SIZE.d / 2 + 1.5,
    label: { ms: "Sentral Lepak", en: "Sentral Lepak" },
  },
  ...BUILDINGS.map((b) => {
    const d = doorSpot(b);
    return { id: b.id, x: d.x, z: d.z + d.facing * 1.2, label: { ms: b.sign, en: b.sign } };
  }),
];

export function placeById(id: string) {
  return PLACES.find((p) => p.id === id) ?? null;
}

/** Outer district bus stops — ride returns to Pusat. */
export const OUTER_BUS_PLACES = [
  "taman-ceria-bus",
  "klcc-bus",
  "menara-lepak-bus",
  "tlx-bus",
  "bukit-bintik-bus",
  "bukit-jalan-bus",
  "kampung-lepak-bus",
  "pasar-besar-bus",
  "petaling-lane-bus",
  "sentral-lepak-bus",
] as const;
