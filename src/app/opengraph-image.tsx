import { GAME } from "@/games/anne-maju/meta";
import { ogCard, ogSize } from "./anne-maju/og-card";

export const alt = GAME.name;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ headline: "Jadi anne mamak.", sub: "Dengar order. Bancuh. Hantar. 90 saat.", footer: "Main percuma" });
}
