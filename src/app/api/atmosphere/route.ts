import { NextResponse } from "next/server";
import {
  type AtmosphereSnapshot,
  hazeFromAqi,
  weatherFromCode,
} from "@/world/atmosphere";

const KL = { lat: 3.139, lon: 101.687 };
const CACHE_MS = 12 * 60 * 1000;

let cached: { at: number; body: AtmosphereSnapshot } | null = null;

async function fetchOpenMeteo(): Promise<{ weather: AtmosphereSnapshot["weather"]; tempC: number | null }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${KL.lat}&longitude=${KL.lon}` +
    `&current=weather_code,precipitation,cloud_cover,temperature_2m&timezone=Asia%2FKuala_Lumpur`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`meteo ${res.status}`);
  const json = (await res.json()) as {
    current?: { weather_code?: number; precipitation?: number; temperature_2m?: number };
  };
  const code = Number(json.current?.weather_code ?? 0);
  const precip = Number(json.current?.precipitation ?? 0);
  const tempC = json.current?.temperature_2m != null ? Number(json.current.temperature_2m) : null;
  return { weather: weatherFromCode(code, precip), tempC };
}

async function fetchWaqi(): Promise<number | null> {
  const token = process.env.WAQI_TOKEN;
  if (!token) return null;
  const url = `https://api.waqi.info/feed/geo:${KL.lat};${KL.lon}/?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`waqi ${res.status}`);
  const json = (await res.json()) as { status?: string; data?: { aqi?: number | string } };
  if (json.status !== "ok") return null;
  const raw = json.data?.aqi;
  const aqi = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(aqi) ? aqi : null;
}

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.body, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
    });
  }

  try {
    const [meteo, aqi] = await Promise.all([fetchOpenMeteo(), fetchWaqi().catch(() => null)]);
    const body: AtmosphereSnapshot = {
      weather: meteo.weather,
      aqi,
      haze: hazeFromAqi(aqi),
      tempC: meteo.tempC,
      updatedAt: Date.now(),
      source: "live",
    };
    cached = { at: Date.now(), body };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
    });
  } catch {
    const body: AtmosphereSnapshot = {
      weather: "clear",
      aqi: null,
      haze: "none",
      tempC: null,
      updatedAt: Date.now(),
      source: "fallback",
    };
    return NextResponse.json(body, { status: 200 });
  }
}
