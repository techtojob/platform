import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Idiomas: ver src/i18n/idiomas.json. Cada idioma tiene su dirección base
// (techtojob.com/empleo, techtojob.com/jobs…). La landing (repo techtojob/landing)
// sigue en la raíz del dominio; Cloudflare envía esas direcciones a esta app.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Prefijo de los archivos de la bolsa (JavaScript, CSS, imágenes). La landing también es
 * una app de Next en techtojob.com y usa /_next; con el prefijo no se pisan:
 * todo lo de la bolsa cuelga de /empleo-recursos, que Cloudflare manda a esta app.
 * Las imágenes de public/ están en public/empleo-recursos por lo mismo.
 */
export const PREFIJO_RECURSOS = "/empleo-recursos";

// Dirección del API (el mismo valor que usa src/lib/api.ts).
const API_URL = process.env.API_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  // El paquete compartido se usa como código TypeScript sin compilar.
  transpilePackages: ["@techtojob/shared"],
  assetPrefix: PREFIJO_RECURSOS,
  // El inicio de sesión (Better Auth) vive en el API, pero se sirve desde la web:
  // así la cookie de sesión es de techtojob.com y no hay líos entre dominios.
  // Cabeceras de seguridad en todas las páginas de la bolsa.
  async headers() {
    return [
      {
        source: "/:ruta*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nadie puede meter la bolsa en un iframe (evita que engañen a alguien para pulsar algo).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Solo HTTPS durante un año (en local, con http, el navegador la ignora).
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
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
