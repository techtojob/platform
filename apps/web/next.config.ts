import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La bolsa vive en techtojob.com/empleo. La landing (repo techtojob/landing)
  // sigue en la raíz del dominio; Cloudflare envía /empleo/* a esta app.
  basePath: "/empleo",
  // El paquete compartido se usa como código TypeScript sin compilar.
  transpilePackages: ["@techtojob/shared"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
