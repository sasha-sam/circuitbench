import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Companies House API is called server-side only — no CORS config needed
  serverExternalPackages: [],
};

export default nextConfig;
