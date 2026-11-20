import type { NextConfig } from "next";

const isExport = process.env.NEXT_EXPORT === 'true';
const backendUrl = process.env.BACKEND_URL || 
                   (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '') : "http://127.0.0.1:5050");

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
