/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "grillvi-gtroad.vercel.app",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "dwdtemplate2.vercel.app",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "dwdtemplate1.vercel.app",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
