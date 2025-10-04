/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Server external packages (moved from experimental)
  // serverExternalPackages: ['@clerk/nextjs'], // Temporarily disabled due to conflict
  experimental: {
    // Ensure TypeScript path mapping works
    typedRoutes: false,
    // Optimize bundle size and performance
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@clerk/nextjs',
      'react-hook-form',
      'zod'
    ],
    // Enable modern bundling optimizations
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },

    // Enable partial prerendering for better performance
    ppr: false, // Disabled for now, enable when stable
  },
  images: {
    unoptimized: false,
    domains: [],
    formats: ['image/webp', 'image/avif'],
    // Optimize image loading
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Serverless function configuration
  serverRuntimeConfig: {
    // Server-side only configuration
  },
  publicRuntimeConfig: {
    // Client and server-side configuration
  },
  // Static file optimization
  compress: true,
  poweredByHeader: false,
  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Redirects and rewrites
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },
  // Output configuration for Vercel
  output: 'standalone',
  // Webpack configuration for optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack, nextRuntime }) => {
    // Handle Edge Runtime compatibility
    if (nextRuntime === 'edge' || !isServer) {
      // Replace Node.js specific modules with browser-compatible versions
      config.resolve.alias = {
        ...config.resolve.alias,
        'fs': false,
        'path': false,
        'crypto': false,
        'stream': false,
        'os': false,
        'util': false,
        'events': false,
        'child_process': false,
        'worker_threads': false,
        'perf_hooks': false,
        // Point to Edge-compatible versions of config modules
        '@c9d/config/environment-fallback-manager': '@c9d/config',
        '@c9d/config/phase-sdk-client': '@c9d/config',
        '@c9d/config/phase-token-loader': '@c9d/config',
      };
      
      // Exclude Node.js modules from Edge Runtime bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
        util: false,
        events: false,
        child_process: false,
        worker_threads: false,
        perf_hooks: false,
      };
    }
    
    // Optimize bundle size and performance
    if (!dev && !isServer) {
      // Enhanced chunk splitting for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Clerk authentication vendor chunk
          clerk: {
            test: /[\\/]node_modules[\\/]@clerk[\\/]/,
            name: 'clerk',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // React and core libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // UI components
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common application code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
          // Authentication components
          auth: {
            test: /[\\/](components|lib)[\\/]auth[\\/]/,
            name: 'auth',
            chunks: 'all',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };

      // Enable tree shaking optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Optimize module concatenation
      config.optimization.concatenateModules = true;
    }

    // Add performance optimizations for all builds
    config.resolve.alias = {
      ...config.resolve.alias,
      // Optimize React imports (using relative paths instead of require.resolve in ES module)
      'react/jsx-runtime': 'react/jsx-runtime',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime',
    };

    // Optimize SVG handling
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    return config;
  },
}

export default nextConfig