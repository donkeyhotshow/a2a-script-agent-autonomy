/**
 * Next.js configuration — ADR-Premium-UI §16.2
 *
 * Rewrites all /api/a2a/* requests to the Vite-based Client API (port 5173).
 * This means every UI component and hook can call `/api/a2a/sessions` etc.
 * without any CORS or port-switching logic.
 *
 * Override the target with NEXT_PUBLIC_A2A_API_URL (useful in Docker / CI).
 */
import type { NextConfig } from "next";

const A2A_API_TARGET =
  process.env["NEXT_PUBLIC_A2A_API_URL"] ?? "http://localhost:5173";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/a2a/:path*",
        destination: `${A2A_API_TARGET}/api/a2a/:path*`,
      },
    ];
  },
};

export default nextConfig;
