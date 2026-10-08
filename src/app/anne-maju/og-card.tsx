import { ImageResponse } from "next/og";
import { GAME } from "@/games/anne-maju/meta";

export const ogSize = { width: 1200, height: 630 };

// Shared layout for the game card and the per-result challenge card
export function ogCard({ headline, sub, footer }: { headline: string; sub: string; footer: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbf3e4",
          color: "#1f1a17",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 96 }}>🫖</span>
          <span style={{ fontSize: 44, fontWeight: 800 }}>{GAME.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 110, fontWeight: 900, lineHeight: 1 }}>{headline}</span>
          <span style={{ fontSize: 40, opacity: 0.75 }}>{sub}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
          <span style={{ background: "#d8352a", color: "white", padding: "10px 24px", borderRadius: 999 }}>{footer}</span>
          <span style={{ opacity: 0.6 }}>play.dotkod.com</span>
        </div>
      </div>
    ),
    ogSize,
  );
}
