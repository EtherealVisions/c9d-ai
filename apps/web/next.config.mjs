/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@c9d/ui', '@c9d/config', '@c9d/types'],
  
  // Disable CSS code splitting to avoid webpack export error
  experimental: {
    optimizeCss: false,
  },
}

export default nextConfig