/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "planify-main.s3.amazonaws.com"
      },
      {
        protocol: "https",
        hostname: "s3.amazonaws.com"
      },
      {
        protocol: "https",
        hostname: "assets-v2.scaler.com"
      }
    ]
  }
};

module.exports = nextConfig;
