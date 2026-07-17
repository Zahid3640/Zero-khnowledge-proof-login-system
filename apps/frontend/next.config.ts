import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Required for pnpm monorepo: trace dependencies from repo root
  outputFileTracingRoot: path.join(__dirname, "../../"),
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve("buffer/"),
    };
    return config;
  },
};

export default nextConfig;
