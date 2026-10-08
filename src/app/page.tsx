import type { Metadata } from "next";
import { HubClient } from "@/hub/hub-client";
import { site } from "@/shared/site";

const title = "Kuala Lepak: Game Bandar 3D Malaysia";
const description =
  "Kau baru pindah ke Kuala Lepak, bandar paling chill di Malaysia. Cari kerja part-time, kenal orang, usap kucing jalanan. Game 3D percuma, terus main dalam browser.";
const image = { url: "/og/play.jpg", width: 1200, height: 630, alt: "Kuala Lepak: bandar 3D Malaysia dengan Restoran Anne Maju" };

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ["kuala lepak", "game malaysia", "game 3d percuma", "browser game malaysia", "anne maju", "game mamak", "bandar 3d"],
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", images: [image], siteName: site.name, locale: site.locale, type: "website" },
  twitter: { title, description, images: [image] },
  appleWebApp: { title: "Kuala Lepak" },
};

// Structured data: the site and the games it links to
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: `${site.url}/`,
  description,
  inLanguage: "ms",
  hasPart: [{ "@type": "VideoGame", name: "Anne Maju", url: `${site.url}/anne-maju` }],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="sr-only">{title}</h1>
      <p className="sr-only">{description}</p>
      <HubClient />
    </>
  );
}
