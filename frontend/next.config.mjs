/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enables a small standalone server output for the Docker image.
  output: "standalone",
  eslint: {
    // Lint is run separately; don't fail production builds on lint warnings.
    ignoreDuringBuilds: true,
  },
  // When BACKEND_INTERNAL_URL is set (production on Render), proxy all /api/*
  // requests to the FastAPI backend. This makes the browser talk to a single
  // origin — no CORS, and the auth refresh cookie stays first-party.
  // Read at server start, so it's a runtime env var (not baked into the build).
  async rewrites() {
    const target = process.env.BACKEND_INTERNAL_URL;
    if (!target) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${target.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
