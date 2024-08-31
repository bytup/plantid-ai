/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["example.com"], // Add any domains you might use for testing
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=*", // This allows camera access
          },
        ],
      },
    ];
  },
};

export default nextConfig;
