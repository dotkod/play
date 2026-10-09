"use client";

import { useEffect } from "react";
import { emit } from "@/core/events";
import { savePosition } from "@/core/profile";
import { BINTIK_BUS_STOP } from "@/world/districts/bukit-bintik/meta";
import { JALAN_BUS_STOP } from "@/world/districts/bukit-jalan/meta";
import { KAMPUNG_BUS_STOP } from "@/world/districts/kampung-lepak/meta";
import { KLCC_BUS_STOP } from "@/world/districts/klcc/meta";
import { MENARA_BUS_STOP } from "@/world/districts/menara-lepak/meta";
import { PASAR_BUS_STOP } from "@/world/districts/pasar-besar/meta";
import { PETALING_BUS_STOP } from "@/world/districts/petaling-lane/meta";
import { SENTRAL_BUS_STOP } from "@/world/districts/sentral-lepak/meta";
import { TAMAN_BUS_STOP } from "@/world/districts/taman-ceria/meta";
import { TLX_BUS_STOP } from "@/world/districts/tlx/meta";
import { requestTeleport } from "@/world/player-bridge";
import type { BusDest } from "@/content/transit/bus-routes";
import { BUS_STOP } from "./colliders";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";
import { TransitCabinView } from "./transit-cabin";

export type { BusDest };

const RIDE_MS = 2800;
const BUS_ACCENT = "#ef4444";

const DROPS: Record<
  Exclude<BusDest, "pusat-lepak">,
  { x: number; z: number; rotY: number; place: string; district: string }
> = {
  "taman-ceria": { x: TAMAN_BUS_STOP.x, z: TAMAN_BUS_STOP.z - 1.2, rotY: Math.PI, place: "taman-ceria-bus", district: "taman-ceria" },
  klcc: { x: KLCC_BUS_STOP.x - 1.2, z: KLCC_BUS_STOP.z, rotY: 0, place: "klcc-bus", district: "klcc" },
  "menara-lepak": { x: MENARA_BUS_STOP.x, z: MENARA_BUS_STOP.z - 1.2, rotY: Math.PI, place: "menara-lepak-bus", district: "menara-lepak" },
  tlx: { x: TLX_BUS_STOP.x, z: TLX_BUS_STOP.z + 1.2, rotY: Math.PI, place: "tlx-bus", district: "tlx" },
  "bukit-bintik": { x: BINTIK_BUS_STOP.x, z: BINTIK_BUS_STOP.z - 1.2, rotY: Math.PI, place: "bukit-bintik-bus", district: "bukit-bintik" },
  "bukit-jalan": { x: JALAN_BUS_STOP.x, z: JALAN_BUS_STOP.z - 1.2, rotY: Math.PI, place: "bukit-jalan-bus", district: "bukit-jalan" },
  "kampung-lepak": { x: KAMPUNG_BUS_STOP.x, z: KAMPUNG_BUS_STOP.z - 1.2, rotY: Math.PI, place: "kampung-lepak-bus", district: "kampung-lepak" },
  "pasar-besar": { x: PASAR_BUS_STOP.x, z: PASAR_BUS_STOP.z - 1.2, rotY: Math.PI, place: "pasar-besar-bus", district: "pasar-besar" },
  "petaling-lane": { x: PETALING_BUS_STOP.x, z: PETALING_BUS_STOP.z + 1.2, rotY: 0, place: "petaling-lane-bus", district: "petaling-lane" },
  "sentral-lepak": { x: SENTRAL_BUS_STOP.x, z: SENTRAL_BUS_STOP.z - 1.2, rotY: Math.PI, place: "sentral-lepak-bus", district: "sentral-lepak" },
};

const DEST_NAME: Record<BusDest, { ms: string; en: string }> = {
  "taman-ceria": { ms: "Taman Ceria", en: "Taman Ceria" },
  "pusat-lepak": { ms: "Pusat Lepak", en: "Pusat Lepak" },
  klcc: { ms: "KLCC", en: "KLCC" },
  "menara-lepak": { ms: "Menara Lepak", en: "Menara Lepak" },
  tlx: { ms: "TLX", en: "TLX" },
  "bukit-bintik": { ms: "Bukit Bintik", en: "Bukit Bintik" },
  "bukit-jalan": { ms: "Bukit Jalan", en: "Bukit Jalan" },
  "kampung-lepak": { ms: "Kampung Lepak", en: "Kampung Lepak" },
  "pasar-besar": { ms: "Pasar Besar", en: "Pasar Besar" },
  "petaling-lane": { ms: "Petaling Lane", en: "Petaling Lane" },
  "sentral-lepak": { ms: "Sentral Lepak", en: "Sentral Lepak" },
};

export function busDestLabel(dest: BusDest, tr: (typeof HUB_STRINGS)["ms"]) {
  const map: Record<BusDest, string> = {
    "taman-ceria": tr.busToTaman,
    "pusat-lepak": tr.busToPusat,
    klcc: tr.busToKlcc,
    "menara-lepak": tr.busToMenara,
    tlx: tr.busToTlx,
    "bukit-bintik": tr.busToBintik,
    "bukit-jalan": tr.busToJalan,
    "kampung-lepak": tr.busToKampung,
    "pasar-besar": tr.busToPasar,
    "petaling-lane": tr.busToPetaling,
    "sentral-lepak": tr.busToSentral,
  };
  return map[dest];
}

export function BusRideOverlay({ dest, onDone }: { dest: BusDest; onDone: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];

  useEffect(() => {
    const a = setTimeout(() => {
      if (dest === "pusat-lepak") {
        requestTeleport(BUS_STOP.x, BUS_STOP.z - 1.2, Math.PI);
        emit({ type: "entered", place: "bus-stop" });
        savePosition("pusat-lepak", BUS_STOP.x, BUS_STOP.z - 1.2);
      } else {
        const d = DROPS[dest];
        requestTeleport(d.x, d.z, d.rotY);
        emit({ type: "entered", place: d.place });
        savePosition(d.district, d.x, d.z);
      }
      emit({ type: "tookBus", to: dest });
    }, RIDE_MS * 0.45);
    const b = setTimeout(() => onDone(), RIDE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest]);

  return (
    <TransitCabinView
      kind="bus"
      accent={BUS_ACCENT}
      title={tr.busRiding}
      subtitle={`RapidLepak → ${DEST_NAME[dest][lang]}`}
    />
  );
}
