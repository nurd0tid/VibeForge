import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vk/contracts"],
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default nextConfig;
