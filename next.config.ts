import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const supabaseHost =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
    const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";
    const csp = [
      "default-src 'self'",
      `connect-src 'self' ${supabaseOrigin} https://*.supabase.co https://*.vercel.app`,
      `img-src 'self' data: blob: ${supabaseOrigin} https://*.supabase.co`,
      `media-src 'self' blob: ${supabaseOrigin} https://*.supabase.co`,
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ]
      .filter(Boolean)
      .join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pyiyzrvwiwaxqrdhvtar.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
