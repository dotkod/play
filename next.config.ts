import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  devIndicators: false,
  // Short commit of the deploy, shown next to the game version (empty locally)
  env: { NEXT_PUBLIC_BUILD: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) },
  // Score cards read the 3D background from disk at request time
  outputFileTracingIncludes: {
    "/anne-maju/k/[code]/opengraph-image": ["./public/og/anne-maju-bare.jpg"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
