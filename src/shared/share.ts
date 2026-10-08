export type ShareInput = { title: string; text: string; url: string; image?: string };

export type ShareOutcome = "shared" | "copied" | "failed";

// Native share sheet on mobile (Threads, WhatsApp), attaching the score card image when the
// platform supports file sharing; clipboard fallback on desktop
export async function shareResult({ title, text, url, image }: ShareInput): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      if (image && navigator.canShare) {
        const blob = await (await fetch(image)).blob();
        const file = new File([blob], "anne-maju.png", { type: blob.type || "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text: `${text} ${url}`, files: [file] });
          return "shared";
        }
      }
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
