import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Docker : bundle autonome (NEXT_OUTPUT=standalone défini dans srcf/Dockerfile) ; sans effet en développement
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  allowedDevOrigins: ["10.160.224.145"],
};

export default nextConfig;