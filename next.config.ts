import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Next.js blocks dev assets from non-localhost hosts. Clerk production
  // keys only accept the applyos.me origin.
  allowedDevOrigins: ["applyos.me", "dev.applyos.me", "127.0.0.1", "localhost"],
};

export default nextConfig;
