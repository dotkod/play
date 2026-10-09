"use client";

import dynamic from "next/dynamic";

const Hub = dynamic(() => import("./hub").then((m) => m.Hub), {
  ssr: false,
  loading: () => <div className="h-dvh w-full bg-[#9fdcd2]" />,
});

// The hub depends on sessionStorage (spawn / start screen), so it only mounts in the browser.
export function HubClient({ initialJob }: { initialJob?: string } = {}) {
  return <Hub initialJob={initialJob} />;
}
