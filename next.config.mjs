/** @type {import('next').NextConfig} */
const nextConfig = {
  // SQLite deployment requires a persistent Node server and writable storage.
  output: "standalone",
};

export default nextConfig;
