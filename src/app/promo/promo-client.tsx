"use client";

import dynamic from "next/dynamic";

const PromoStudio = dynamic(() => import("@/promo/studio"), { ssr: false });

export function PromoClient() {
  return <PromoStudio />;
}
