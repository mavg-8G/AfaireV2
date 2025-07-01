import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const apiDestination =
      process.env.EXTERNAL_API_BASE_URL || "https://afaire.is-cool.dev";
    return [
      {
        source: "/api/:path*",
        destination: `${apiDestination}/api/:path*`,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: [
    "https://6000-firebase-studio-1747625597829.cluster-uf6urqn4lned4spwk4xorq6bpo.cloudworkstations.dev",
  ],
  experimental: {
    // legacyBrowsers: false, // This line was removed
    serverActions: {
      allowedOrigins: [
        "6000-firebase-studio-1747625597829.cluster-uf6urqn4lned4spwk4xorq6bpo.cloudworkstations.dev",
      ],
    },
  },
};

export default nextConfig;
