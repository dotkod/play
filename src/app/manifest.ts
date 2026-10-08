import type { MetadataRoute } from "next";

// "Add to Home Screen" opens the Play MY city fullscreen
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Play MY",
    short_name: "Play MY",
    description: "Bandar 3D ala Malaysia penuh game pendek. Jalan-jalan, masuk kedai, terus main.",
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
