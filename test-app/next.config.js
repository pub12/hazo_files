/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['hazo_files'],
  // Prevent Next.js from bundling these packages - they need to run as native Node.js modules
  // sql.js uses WebAssembly and CommonJS which doesn't work well with webpack bundling
  experimental: {
    serverComponentsExternalPackages: ['sql.js', 'hazo_connect'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Force sql.js and hazo_connect to be external (not bundled)
      // This is needed for local file: packages that serverComponentsExternalPackages doesn't handle
      config.externals = config.externals || [];
      config.externals.push({
        'sql.js': 'commonjs sql.js',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
