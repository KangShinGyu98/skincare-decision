import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // standalone 출력은 Docker 이미지용이다. Vercel 빌드에서는 필요 없다.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
};

export default nextConfig;
