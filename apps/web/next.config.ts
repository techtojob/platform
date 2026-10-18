import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Idiomas: ver src/i18n/idiomas.json. Cada idioma tiene su dirección base
// (techtojob.com/empleo, techtojob.com/jobs…). La landing (repo techtojob/landing)
// sigue en la raíz del dominio; Cloudflare envía esas direcciones a esta app.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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

export default withNextIntl(nextConfig);
