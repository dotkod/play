import type { Metadata } from "next";
import { HubPoster } from "@/hub/poster";

// Screenshot source for the city OG image (see scripts/og-shot.sh). Not meant for players.
export const metadata: Metadata = { title: "Poster", robots: { index: false, follow: false } };

export default function Page() {
  return <HubPoster />;
}
