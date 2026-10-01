import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev is bound to 0.0.0.0 and opened at 127.0.0.1. Next blocks that host
  // unless it is listed, which stops the client bundle from hydrating.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
