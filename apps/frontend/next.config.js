/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // enables minimal Docker image
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
};

module.exports = nextConfig;
