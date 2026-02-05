import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    '/': [
      './node_modules/@aztec/bb.js/dest/node/barretenberg_wasm/**/*',
      './node_modules/@aztec/bb.js/dest/node/barretenberg_wasm/barretenberg_wasm_thread/factory/node/thread.worker.js',
    ],
    '/assets': [
      './node_modules/@aztec/bb.js/dest/node/barretenberg_wasm/**/*',
      './node_modules/@aztec/bb.js/dest/node/barretenberg_wasm/barretenberg_wasm_thread/factory/node/thread.worker.js',
    ],
  },
  webpack: (config) => {
    config.experiments = {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    }
    
    // // Add rule to handle WASM files
    // config.module.rules.push({
    //   test: /\.wasm$/,
    //   type: 'asset/resource',
    // })

    // Add fallback for pino-pretty
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    }
    
    return config
  },
  // Add external packages configuration
  serverExternalPackages: ['@aztec/bb.js']
};

export default nextConfig;