import type { NextConfig } from "next";

/**
 * Se exporta como sitio estático (HTML) para publicarlo en GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH es la subcarpeta del sitio, p. ej. "/eleccion-representantes-2026".
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
