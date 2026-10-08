import { ogCard, ogSize } from "./og-card";

export const alt = "Anne Maju";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ headline: "Jadi anne mamak.", sub: "Dengar order. Bancuh. Hantar. 90 saat.", footer: "Main percuma" });
}
