import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { esBot, idiomaDeRuta, idiomaPreferido, traducirRuta } from "./i18n/deteccion";
import { basesIdiomas, COOKIE_IDIOMA, locales, routing, type Locale } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * Elige el idioma de cada visita:
 * 1. Si la persona eligió idioma a mano (cookie), se respeta siempre.
 * 2. Si no, idioma del navegador → país (Cloudflare) → español.
 * Si la dirección está en otro idioma, se lleva a la misma página en el suyo.
 * A los buscadores (Google…) nunca se les redirige: ven cada idioma en su dirección.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookie = request.cookies.get(COOKIE_IDIOMA)?.value;
  const elegido = (locales as string[]).includes(cookie ?? "") ? (cookie as Locale) : null;
  const detectado = idiomaPreferido(
    request.headers.get("accept-language"),
    request.headers.get("cf-ipcountry"),
  );

  const enRuta = idiomaDeRuta(pathname);

  // Fuera de /empleo, /jobs… (en local, la raíz): al inicio del idioma de la persona.
  if (!enRuta) {
    const url = request.nextUrl.clone();
    url.pathname = basesIdiomas[elegido ?? detectado];
    return NextResponse.redirect(url);
  }

  const deseado = elegido ?? (esBot(request.headers.get("user-agent")) ? null : detectado);
  if (deseado && deseado !== enRuta) {
    const url = request.nextUrl.clone();
    url.pathname = traducirRuta(pathname, enRuta, deseado);
    return NextResponse.redirect(url);
  }

  return conXDefault(intl(request));
}

/**
 * next-intl anuncia a Google las versiones de cada idioma (cabecera `Link`).
 * Su versión "x-default" apunta a la raíz del dominio, que es la landing;
 * la cambiamos por la versión en el idioma por defecto.
 */
function conXDefault(response: NextResponse): NextResponse {
  const link = response.headers.get("link");
  if (!link) return response;
  const enlaces = link.split(/,\s*(?=<)/);
  const porDefecto = enlaces.find((e) => e.includes(`hreflang="${routing.defaultLocale}"`));
  const url = porDefecto?.match(/^<([^>]+)>/)?.[1];
  if (!url) return response;
  response.headers.set(
    "link",
    enlaces
      .map((e) => (e.includes('hreflang="x-default"') ? `<${url}>; rel="alternate"; hreflang="x-default"` : e))
      .join(", "),
  );
  return response;
}

export const config = {
  // Todo menos archivos internos de Next, la API y archivos con extensión (favicon.ico…).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
