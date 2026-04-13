/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent the page from being embedded in an iframe (clickjacking)
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Stop browsers from MIME-sniffing the content type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send the origin as Referer (no full URL), nothing to cross-origin
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Enable XSS filter in older browsers
  { key: 'X-XSS-Protection',       value: '1; mode=block' },
  // Disable browser features not needed by this app
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
