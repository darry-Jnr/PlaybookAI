import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // single-process app: frontend + API route handlers on the same server
  turbopack: { root: __dirname },
};

export default nextConfig;
