/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@c9d/ui', '@c9d/config', '@c9d/types'],
}

export default nextConfig