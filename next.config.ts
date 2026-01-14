import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // Avoid Turbopack mis-detecting the repo root due to unrelated lockfiles
    root: __dirname,
  },
}

export default nextConfig
