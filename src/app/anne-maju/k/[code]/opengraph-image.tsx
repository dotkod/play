import { decodeResult, rankFor, rm } from "@/games/anne-maju/result";
import { ogCard, ogSize } from "../../og-card";

export const alt = "Keputusan Anne Maju";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const r = decodeResult((await params).code);
  if (!r) return ogCard({ headline: "Jadi anne mamak.", sub: "Ingat order. Bancuh. Hantar.", footer: "Main percuma" });
  const rank = rankFor(r.earned);
  return ogCard({
    headline: rm(r.earned),
    sub: `${rank.emoji} ${rank.title} · ${r.served} air dihantar`,
    footer: "Boleh lawan?",
  });
}
