"use client";

import { applyJobPayout } from "./profile";

export const JOB_RESULT_KEY = "kuala-lepak:job-result";

export type JobResult = {
  job: string;
  earned: number;
  served: number;
  mode: string;
};

function readQueue(): JobResult[] {
  try {
    const raw = sessionStorage.getItem(JOB_RESULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as JobResult[]) : [];
  } catch {
    return [];
  }
}

export function queueJobResult(result: JobResult) {
  try {
    const next = [...readQueue(), result];
    sessionStorage.setItem(JOB_RESULT_KEY, JSON.stringify(next));
  } catch {}
}

/** Bank wallet now; caller should emit jobFinished after the task engine is listening. */
export function settleJobResults() {
  const queued = readQueue();
  try {
    sessionStorage.removeItem(JOB_RESULT_KEY);
  } catch {}
  const results: JobResult[] = [];
  let earned = 0;
  for (const result of queued) {
    if (!result || typeof result.job !== "string") continue;
    const pay = {
      job: result.job,
      earned: Number(result.earned) || 0,
      served: Number(result.served) || 0,
      mode: String(result.mode || "normal"),
    };
    applyJobPayout(pay);
    results.push(pay);
    earned += pay.earned;
  }
  return { earned, results };
}
