/** @type {import('next').NextConfig} */
const nextConfig = {
  // SQLite deployment requires a persistent Node server and writable storage.
  output: "standalone",
  // Next 16.4 checks npm advisories even with telemetry disabled. Verification
  // audits dependencies separately, outside its deterministic offline boundary.
  experimental: {
    agentUpgrade: process.env.VERIFICATION_NETWORK_DIR ? false : "security",
  },
};

export default nextConfig;
