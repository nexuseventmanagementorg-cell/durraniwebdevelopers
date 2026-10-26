import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: {
    unoptimized: true, // Guarantees local webp image assets render crisply without remote domain constraints
  },
};

export default nextConfig;
