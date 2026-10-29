import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/render reads the wig reference images from public/ at runtime to upload
  // them to YouCam. The tracer can't see a runtime path, so without this the
  // serverless bundle ships without them and every live wig render fails.
  outputFileTracingIncludes: {
    "/api/render": ["./public/refs/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
