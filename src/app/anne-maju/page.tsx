import type { Metadata } from "next";
import { AnneMajuGame } from "@/games/anne-maju/game";

export const metadata: Metadata = {
  title: { absolute: "Anne Maju: Game Mamak 90 Saat" },
  description: "Satu shift jadi anne mamak. Ingat order, bancuh, hantar. Berapa RM kau boleh kutip?",
};

export default function Page() {
  return <AnneMajuGame />;
}
