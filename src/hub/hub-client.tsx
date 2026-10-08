"use client";

import dynamic from "next/dynamic";

// The hub depends on sessionStorage (where to spawn, whether to show the start screen),
// so it renders only in the browser; the page around it still carries the SEO text.
export const HubClient = dynamic(() => import("./hub").then((m) => m.Hub), {
  ssr: false,
  loading: () => <div className="h-dvh w-full bg-[#9fdcd2]" />,
});
