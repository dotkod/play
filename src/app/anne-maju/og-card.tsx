import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { GAME } from "@/games/anne-maju/meta";
import { googleFont } from "@/shared/og-font";

export const ogSize = { width: 1200, height: 630 };

let background: Promise<string> | null = null;
const loadBackground = () =>
  (background ??= readFile(join(process.cwd(), GAME.ogBackground)).then((b) => `data:image/jpeg;base64,${b.toString("base64")}`));

const stroke = "#1f1a17";

// Share card for a single result: the 3D shop render with the score painted over it
export async function scoreCard({ headline, sub, badge }: { headline: string; sub: string; badge: string }) {
  const [bg, font] = await Promise.all([loadBackground(), googleFont("Baloo 2", 800)]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Baloo" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bg} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: "0 64px", width: "100%" }}>
          <div style={{ display: "flex" }}>
            <span style={{ background: "#d8352a", color: "white", fontSize: 30, padding: "6px 22px", borderRadius: 999 }}>{badge}</span>
          </div>
          <span style={{ fontSize: 60, color: "#fbf3e4", textShadow: `0 4px 0 ${stroke}` }}>{GAME.name}</span>
          <span
            style={{
              fontSize: 168,
              lineHeight: 1,
              color: "#fcd34d",
              textShadow: `6px 6px 0 ${stroke}, -6px -6px 0 ${stroke}, 6px -6px 0 ${stroke}, -6px 6px 0 ${stroke}, 0 10px 0 ${stroke}`,
            }}
          >
            {headline}
          </span>
          <span style={{ fontSize: 42, color: "#fbf3e4", textShadow: `0 3px 0 ${stroke}` }}>{sub}</span>
          <div style={{ display: "flex", marginTop: 14 }}>
            <span style={{ background: "#fcd34d", color: stroke, fontSize: 36, padding: "8px 28px", borderRadius: 18, boxShadow: `0 6px 0 ${stroke}` }}>
              ▶ Boleh lawan?
            </span>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: font ? [{ name: "Baloo", data: font, weight: 800, style: "normal" }] : undefined },
  );
}
