import type { MetadataRoute } from "next";
import { GAME } from "@/games/anne-maju/meta";
import { site } from "@/shared/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${site.url}/${GAME.slug}`, changeFrequency: "weekly", priority: 1 }];
}
