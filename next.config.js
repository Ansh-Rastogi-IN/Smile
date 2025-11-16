/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    config.experiments = { 
      asyncWebAssembly: true, 
      layers: true 
    };
    return config;
  },
  transpilePackages: ['@vladmandic/face-api'],
}

module.exports = nextConfig
