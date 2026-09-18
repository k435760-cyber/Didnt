/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 내보내기: Cloudflare Pages / Vercel / 단일 파일 번들 모두 동일한 산출물을 쓴다.
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
