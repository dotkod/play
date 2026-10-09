export const BUS_FARE_SEN = 100; // RM1.00

export type BusDest =
  | "taman-ceria"
  | "pusat-lepak"
  | "klcc"
  | "menara-lepak"
  | "tlx"
  | "bukit-bintik"
  | "bukit-jalan"
  | "kampung-lepak"
  | "pasar-besar"
  | "petaling-lane"
  | "sentral-lepak";

export type BusRouteId = "B101" | "B202";

export type BusRoute = {
  id: BusRouteId;
  /** Minutes between departures from Pusat. */
  headwayMin: number;
  /** Phase offset so routes don't arrive together. */
  phaseMin: number;
  color: string;
  stops: Exclude<BusDest, "pusat-lepak">[];
  label: { ms: string; en: string };
};

export const BUS_ROUTES: BusRoute[] = [
  {
    id: "B101",
    headwayMin: 8,
    phaseMin: 1,
    color: "#1f5fa8",
    label: { ms: "Laluan Timur / Utara", en: "East / North loop" },
    stops: ["taman-ceria", "klcc", "tlx", "petaling-lane"],
  },
  {
    id: "B202",
    headwayMin: 10,
    phaseMin: 4,
    color: "#c62f25",
    label: { ms: "Laluan Barat / Selatan", en: "West / South loop" },
    stops: ["menara-lepak", "kampung-lepak", "pasar-besar", "bukit-jalan", "bukit-bintik", "sentral-lepak"],
  },
];

export function routeForDest(dest: BusDest): BusRoute | null {
  if (dest === "pusat-lepak") return null;
  return BUS_ROUTES.find((r) => r.stops.includes(dest)) ?? null;
}

/** Minutes until next departure for a route (0 = due now). Deterministic from local time. */
export function etaMinutes(route: BusRoute, now = new Date()): number {
  const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const cycle = route.headwayMin;
  const phase = route.phaseMin % cycle;
  const into = ((mins - phase) % cycle + cycle) % cycle;
  const wait = (cycle - into) % cycle;
  return Math.round(wait);
}

export function etaLabel(mins: number, lang: "ms" | "en"): string {
  if (mins <= 0) return lang === "ms" ? "Tiba" : "Due";
  if (lang === "ms") return `${mins} min`;
  return `${mins} min`;
}

/** Next arrivals for the LED board (sorted soonest first). */
export function nextArrivals(now = new Date()) {
  return BUS_ROUTES.map((r) => ({
    route: r,
    eta: etaMinutes(r, now),
  })).sort((a, b) => a.eta - b.eta);
}

/** Route that serves return trips to Pusat from an outer stop (any route that includes that stop). */
export function returnRouteForStop(dest: Exclude<BusDest, "pusat-lepak">): BusRoute {
  return routeForDest(dest) ?? BUS_ROUTES[0];
}
