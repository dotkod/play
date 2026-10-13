"use client";

/**
 * Vercel Web Analytics custom events. Page views come from <Analytics /> in the root layout;
 * this adds the game funnel (sign up, enter the city, jobs, rides). No usernames or other
 * personal data go into event properties.
 */

import { track } from "@vercel/analytics";
import { on } from "./events";

type Props = Record<string, string | number | boolean | null>;

export function trackEvent(name: string, props?: Props) {
  try {
    track(name, props);
  } catch {
    // Analytics must never break the game
  }
}

let bound = false;

/** Forward game events to analytics. Safe to call more than once. */
export function bindGameAnalytics() {
  if (bound) return;
  bound = true;
  on((e) => {
    if (e.type === "jobFinished") trackEvent("job_finished", { job: e.job, mode: e.mode, earned: e.earned, served: e.served });
    else if (e.type === "tookLrt") trackEvent("lrt_ride", { to: e.to });
    else if (e.type === "tookTaxi") trackEvent("taxi_ride", { to: e.to });
  });
}
