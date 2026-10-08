import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  devIndicators: false,
  // Score cards read the 3D background from disk at request time
  outputFileTracingIncludes: {
    "/anne-maju/k/[code]/opengraph-image": ["./public/og/anne-maju-bare.jpg"],
  },
  // Temporary until the root gets its own homepage; 307 so browsers don't cache it
  async redirects() {
    return [{ source: "/", destination: "/anne-maju", permanent: false }];
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
