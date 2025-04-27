import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['react-audio-voice-recorder'],
  webpack: (config) => {
    // Add a fallback for the 'import.meta.url' feature
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/react-audio-voice-recorder/,
      resolve: {
        fallback: {
          path: false,
          fs: false,
          url: false,
        },
      },
    });
    return config;
  },
};

export default nextConfig;