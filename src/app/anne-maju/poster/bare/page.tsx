import type { Metadata } from "next";
import { Poster } from "@/games/anne-maju/poster";

export const metadata: Metadata = { title: "Poster", robots: { index: false, follow: false } };

export default function Page() {
  return <Poster bare />;
}
