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
    return [
      {
        source: "/api/:path*",
        destination: "https://afaire.is-cool.dev/api/:path*",
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
