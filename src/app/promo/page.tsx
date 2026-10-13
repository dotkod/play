import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromoClient } from "./promo-client";

// Marketing render studio (logo, posts, intro video). Local only: see scripts/promo.mjs.
export const metadata: Metadata = { title: "Promo", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PromoClient />;
}
