import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as idiomaDeLaRuta } from "next/root-params";
import { routing } from "./routing";

type Mensajes = Record<string, unknown>;

/** Mezcla `base` con `encima`: lo que falte en `encima` se toma de `base`. */
function mezclar(base: Mensajes, encima: Mensajes): Mensajes {
  const resultado: Mensajes = { ...base };
  for (const [clave, valor] of Object.entries(encima)) {
    const anterior = resultado[clave];
    resultado[clave] =
      valor && typeof valor === "object" && anterior && typeof anterior === "object"
        ? mezclar(anterior as Mensajes, valor as Mensajes)
        : valor;
  }
  return resultado;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // El idioma sale de la dirección (/empleo → es). `requestLocale` queda de respaldo.
  const pedido = (await idiomaDeLaRuta()) ?? (await requestLocale);
  const locale = hasLocale(routing.locales, pedido) ? pedido : routing.defaultLocale;

  const propios = (await import(`../../messages/${locale}.json`)).default as Mensajes;
  // Si a un idioma le falta algún texto, se muestra en inglés en vez de romperse.
  const messages =
    locale === "en"
      ? propios
      : mezclar((await import("../../messages/en.json")).default as Mensajes, propios);

  return { locale, messages };
});
