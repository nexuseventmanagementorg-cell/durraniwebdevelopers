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
        hostname: "gtroad1.vercel.app",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "student-burgers-and-shawarmas.vercel.app",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
