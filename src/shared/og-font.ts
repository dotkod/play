// Fetches a Google Font as TTF for next/og (Satori can't read woff2).
// Without a browser User-Agent, Google Fonts serves TTF URLs.
const cache = new Map<string, Promise<ArrayBuffer | null>>();

export function googleFont(family: string, weight: number) {
  const key = `${family}:${weight}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        try {
          const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
          const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
          return url ? await (await fetch(url)).arrayBuffer() : null;
        } catch {
          return null;
        }
      })(),
    );
  }
  return cache.get(key)!;
}
