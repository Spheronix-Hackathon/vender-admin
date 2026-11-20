import type { NextConfig } from "next";

const isExport = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5050/api/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://127.0.0.1:5050/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
