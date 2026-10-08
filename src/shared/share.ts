export type ShareInput = { title: string; text: string; url: string };

export type ShareOutcome = "shared" | "copied" | "failed";

// Native share sheet on mobile (Threads, WhatsApp), clipboard fallback on desktop
export async function shareResult({ title, text, url }: ShareInput): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
