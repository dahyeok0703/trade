import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // server actions are enabled by default in Next 15; keep body limit sane for doc uploads later.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
