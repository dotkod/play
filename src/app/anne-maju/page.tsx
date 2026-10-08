import type { Metadata } from "next";
import { AnneMajuGame } from "@/games/anne-maju/game";
import { GAME } from "@/games/anne-maju/meta";
import { site } from "@/shared/site";

const url = `/${GAME.slug}`;
const image = { url: GAME.ogImage, width: 1200, height: 630, alt: `${GAME.name}: game mamak 3D` };

export const metadata: Metadata = {
  title: GAME.title,
  description: GAME.description,
  keywords: GAME.keywords,
  alternates: { canonical: url },
  openGraph: { title: GAME.title, description: GAME.description, url, images: [image], siteName: GAME.name, locale: site.locale, type: "website" },
  twitter: { title: GAME.title, description: GAME.description, images: [image] },
  appleWebApp: { title: GAME.name },
};

// Structured data so search engines know this page is a playable game
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: GAME.name,
  description: GAME.description,
  url: `${site.url}${url}`,
  image: `${site.url}${GAME.ogImage}`,
  inLanguage: "ms",
  genre: ["Casual", "Simulation", "Time management"],
  gamePlatform: "Web browser",
  playMode: "SinglePlayer",
  applicationCategory: "Game",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: 0, priceCurrency: "MYR" },
  author: { "@type": "Organization", name: "Dotkod", url: "https://dotkod.com" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Real text for crawlers; the game itself is canvas */}
      <h1 className="sr-only">{GAME.title}</h1>
      <p className="sr-only">{GAME.description}</p>
      <AnneMajuGame />
    </>
  );
}
