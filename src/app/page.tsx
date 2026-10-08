import type { Metadata } from "next";
import { HubClient } from "@/hub/hub-client";
import { site } from "@/shared/site";

const title = "Play MY · Game 3D Malaysia Percuma";
const description =
  "Jalan-jalan dalam bandar 3D ala Malaysia, masuk kedai dan terus main. Mula dengan Anne Maju, game mamak 90 saat. Percuma, tak perlu install.";
const image = { url: "/og/play.jpg", width: 1200, height: 630, alt: "Play MY: game 3D Malaysia dengan Restoran Anne Maju" };

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ["game malaysia", "game 3d percuma", "browser game malaysia", "anne maju", "game mamak", "bandar 3d"],
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", images: [image], siteName: site.name, locale: site.locale, type: "website" },
  twitter: { title, description, images: [image] },
  appleWebApp: { title: "Play MY" },
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
