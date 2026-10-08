import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/shared/site";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Kuala Lepak: Game Bandar 3D Malaysia", template: "%s" },
  description: "Kau baru pindah ke Kuala Lepak, bandar paling chill di Malaysia. Cari kerja part-time, kenal orang, usap kucing jalanan. Game 3D percuma, terus main dalam browser.",
  applicationName: site.name,
  formatDetection: { telephone: false },
  openGraph: { siteName: site.name, locale: site.locale, type: "website" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Kuala Lepak" },
};

export const viewport: Viewport = {
  themeColor: "#2f8f86",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
