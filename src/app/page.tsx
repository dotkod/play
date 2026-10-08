import type { Metadata } from "next";
import { Hub } from "@/hub/hub";
import { site } from "@/shared/site";

const title = "Play: Game 3D Malaysia Percuma";
const description =
  "Jalan-jalan dalam bandar 3D Malaysia dan masuk kedai untuk main game. Mula dengan Restoran Anne Maju: jadi anne mamak 90 saat. Percuma, terus dalam browser.";
const image = { url: "/og/anne-maju.jpg", width: 1200, height: 630, alt: "Play: bandar 3D dengan Restoran Anne Maju" };

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", images: [image], siteName: site.name, locale: site.locale, type: "website" },
  twitter: { title, description, images: [image] },
};

export default function Home() {
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <p className="sr-only">{description}</p>
      <Hub />
    </>
  );
}
