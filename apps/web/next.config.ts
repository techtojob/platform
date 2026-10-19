import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Idiomas: ver src/i18n/idiomas.json. Cada idioma tiene su dirección base
// (techtojob.com/empleo, techtojob.com/jobs…). La landing (repo techtojob/landing)
// sigue en la raíz del dominio; Cloudflare envía esas direcciones a esta app.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Dirección del API (el mismo valor que usa src/lib/api.ts).
const API_URL = process.env.API_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  // El paquete compartido se usa como código TypeScript sin compilar.
  transpilePackages: ["@techtojob/shared"],
  cacheComponents: true,
  partialPrefetching: true,
  // El inicio de sesión (Better Auth) vive en el API, pero se sirve desde la web:
  // así la cookie de sesión es de techtojob.com y no hay líos entre dominios.
  async rewrites() {
    return [{ source: "/api/auth/:ruta*", destination: `${API_URL}/api/auth/:ruta*` }];
  },
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
