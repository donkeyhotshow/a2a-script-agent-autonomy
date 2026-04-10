/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/a2a/:path*",
        destination: "http://localhost:5173/api/a2a/:path*",
      },
    ];
  },
};

export default nextConfig;
