import type { MetadataRoute } from "next";

// "Add to Home Screen" opens Kuala Lepak fullscreen
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kuala Lepak",
    short_name: "Kuala Lepak",
    description: "Bandar paling chill di Malaysia. Hidup, kerja, lepak.",
    start_url: "/",
    display: "fullscreen",
    background_color: "#9fdcd2",
    theme_color: "#1f1a17",
    lang: "ms",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
