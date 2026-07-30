import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 打开图片优化：背景图 bg-home.jpg 1.1 MB JPG 不走优化会直接砸 LCP
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1920],
  },
};

export default nextConfig;
