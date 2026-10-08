import type { MetadataRoute } from "next";
import { site } from "@/shared/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/anne-maju/poster", "/anne-maju/k/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
