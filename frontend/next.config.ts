import type { NextConfig } from 'next';

// 배포 환경에서는 프론트와 API 가 다른 Vercel 프로젝트라서, 브라우저에는 같은 도메인의 /api 로 보이도록 프록시한다. (ADR-0008)
// 쿠키가 프론트 도메인에 그대로 심기므로 세션 쿠키 설계를 바꾸지 않아도 된다.
const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  // standalone 출력은 Docker 이미지용이다. Vercel 빌드에서는 필요 없다.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  async rewrites() {
    return apiOrigin ? [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }] : [];
  },
};

export default nextConfig;
