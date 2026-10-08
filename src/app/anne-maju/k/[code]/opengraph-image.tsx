import { decodeResult, rankFor, rm } from "@/games/anne-maju/result";
import { ogSize, scoreCard } from "../../og-card";

export const alt = "Keputusan Anne Maju";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const r = decodeResult((await params).code);
  if (!r) return scoreCard({ headline: "RM??", sub: "Jadi anne mamak 90 saat", badge: "🇲🇾 Game mamak" });
  const rank = rankFor(r.earned);
  return scoreCard({ headline: rm(r.earned), sub: `${rank.emoji} ${rank.title} · ${r.served} air dihantar`, badge: "Kawan kau dapat" });
}
