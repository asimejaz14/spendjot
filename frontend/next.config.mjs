/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enables a small standalone server output for the Docker image.
  output: "standalone",
  eslint: {
    // Lint is run separately; don't fail production builds on lint warnings.
    ignoreDuringBuilds: true,
  },
  // Proxy all /api/* requests to the FastAPI backend so the browser talks to a
  // single origin — no CORS, and the auth refresh cookie stays first-party.
  //
  // IMPORTANT: rewrites() is evaluated at BUILD time and baked into the image.
  // Render injects env vars only at RUNTIME, so a build-time default is required
  // — otherwise the rule is empty and /api/* 404s. The default is the deployed
  // API URL; override it by passing BACKEND_INTERNAL_URL during `next build`.
  async rewrites() {
    const target = (
      process.env.BACKEND_INTERNAL_URL || "https://spendjot-api.onrender.com"
    ).replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
