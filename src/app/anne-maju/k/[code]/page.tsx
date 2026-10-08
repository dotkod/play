import type { Metadata } from "next";
import { Suspense } from "react";
import { AnneMajuGame } from "@/games/anne-maju/game";
import { GAME } from "@/games/anne-maju/meta";
import { decodeResult, rankFor, rm } from "@/games/anne-maju/result";

type Props = PageProps<"/anne-maju/k/[code]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = decodeResult((await params).code);
  if (!r) return { title: GAME.name };
  const title = `Kawan kau kutip ${rm(r.earned)} jadi anne mamak`;
  return { title, description: `${rankFor(r.earned).title}. Boleh lawan?`, robots: { index: false } };
}

// Shared challenge link: same game, with the friend's score as a banner
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<AnneMajuGame />}>
      <Challenge params={params} />
    </Suspense>
  );
}

async function Challenge({ params }: Pick<Props, "params">) {
  const r = decodeResult((await params).code);
  const challenge = r ? `Kawan kau kutip ${rm(r.earned)} (${rankFor(r.earned).title}). Boleh lawan?` : undefined;
  return <AnneMajuGame challenge={challenge} />;
}
