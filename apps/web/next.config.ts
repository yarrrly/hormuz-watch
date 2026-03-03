import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Allow importing from packages/shared
  transpilePackages: ["@hormuz-watch/shared"],
};

export default nextConfig;
