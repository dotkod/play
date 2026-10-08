import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/shared/site";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Play · Bandar Game 3D Malaysia", template: "%s" },
  description: "Bandar 3D ala Malaysia penuh game pendek. Jalan-jalan, masuk kedai, terus main. Percuma dalam browser.",
  applicationName: site.name,
  formatDetection: { telephone: false },
  openGraph: { siteName: site.name, locale: site.locale, type: "website" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Play" },
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
