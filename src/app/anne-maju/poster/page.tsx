import type { Metadata } from "next";
import { Poster } from "@/games/anne-maju/poster";

// Screenshot source for the OG image (see scripts/og-shot.sh). Not meant for players.
export const metadata: Metadata = { title: "Poster", robots: { index: false, follow: false } };

export default function Page() {
  return <Poster />;
}
