import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer tourne côté serveur dans les routes PDF.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
