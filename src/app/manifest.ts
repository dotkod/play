import type { MetadataRoute } from "next";
import { GAME } from "@/games/anne-maju/meta";

// "Add to Home Screen" opens straight into the game, fullscreen and landscape
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: GAME.title,
    short_name: GAME.name,
    description: GAME.description,
    start_url: `/${GAME.slug}`,
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#2f8f86",
    theme_color: "#2f8f86",
    lang: "ms",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
