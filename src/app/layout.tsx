import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GAME } from "@/games/anne-maju/meta";
import { site } from "@/shared/site";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: GAME.name, template: `%s · ${GAME.name}` },
  description: GAME.tagline,
};

export const viewport: Viewport = {
  themeColor: "#fbf3e4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ms" className={`${baloo.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
