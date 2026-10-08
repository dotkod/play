import type { Metadata } from "next";
import { Suspense } from "react";
import { AnneMajuGame } from "@/games/anne-maju/game";
import { GAME } from "@/games/anne-maju/meta";
import { decodeResult, rankFor, rm } from "@/games/anne-maju/result";

type Props = PageProps<"/anne-maju/k/[code]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = decodeResult((await params).code);
  if (!r) return { title: GAME.title, alternates: { canonical: `/${GAME.slug}` }, robots: { index: false } };
  const title = `Kawan kau kutip ${rm(r.earned)} kat ${GAME.name}. Boleh lawan?`;
  const description = `${rankFor(r.earned).title} · ${r.served} air dihantar dalam 90 saat. Jadi anne mamak dan cuba kalahkan skor ni.`;
  // Challenge links unfurl with the score card but point search engines at the main game page
  return {
    title,
    description,
    alternates: { canonical: `/${GAME.slug}` },
    robots: { index: false, follow: true },
    openGraph: { title, description },
    twitter: { title, description },
  };
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
  return <AnneMajuGame challenge={r?.earned} />;
}
