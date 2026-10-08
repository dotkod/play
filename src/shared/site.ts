// Canonical origin for metadata, OG images and the sitemap. Falls back to the
// Vercel production domain so previews before the custom domain still unfurl.
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? (vercelProd ? `https://${vercelProd}` : "http://localhost:3210"),
  name: "Kuala Lepak",
  locale: "ms_MY",
};
