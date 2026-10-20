import { describirRemoto, type OfertaListado, type Remoto } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";

/** Trozos de una oferta que salen igual en la fila del listado y en la página de la oferta. */

/** Como mucho, cuántos sitios se nombran: a partir de ahí, "y 2 más". */
const MAXIMO_SITIOS = 3;

/**
 * Desde dónde se puede trabajar, en corto:
 * "Desde cualquier país", "Solo España", "España y Latinoamérica", "Europa salvo Reino Unido",
 * "México, Colombia, Chile y 2 más".
 * Devuelve una función para poder usarla con varias ofertas (y en el formulario del staff, mientras se edita).
 */
export function useDondeRemoto(): (r: Remoto) => string | null {
  const t = useTranslations();
  const locale = useLocale();
  return (r) => {
    const d = describirRemoto(r);
    if (d.mundo) return t("remoto.mundo");
    if (!d.partes.length) return null;
    const pais = new Intl.DisplayNames([locale], { type: "region" });
    const lista = new Intl.ListFormat(locale, { type: "conjunction" });
    const nombres = d.partes.map((p) => {
      if (p.tipo === "pais") return pais.of(p.pais) ?? p.pais;
      const region = t(`regiones.${p.region}`);
      return p.salvo.length ? t("remoto.salvo", { region, paises: lista.format(p.salvo.map((c) => pais.of(c) ?? c)) }) : region;
    });
    if (nombres.length === 1) return d.partes[0]!.tipo === "pais" ? t("remoto.solo", { lugar: nombres[0]! }) : nombres[0]!;
    return lista.format(
      nombres.length > MAXIMO_SITIOS + 1
        ? [...nombres.slice(0, MAXIMO_SITIOS), t("remoto.mas", { count: nombres.length - MAXIMO_SITIOS })]
        : nombres,
    );
  };
}

/** "Las Palmas de Gran Canaria · Híbrido" o "Remoto · España y Latinoamérica", para la fila del listado. */
export function useLugarCorto(oferta: OfertaListado): string {
  const t = useTranslations();
  const locale = useLocale();
  const donde = useDondeRemoto();
  if (oferta.modalidad === "remoto") {
    const texto = donde({ mundo: oferta.remotoMundo, paises: oferta.remotoPaises });
    return texto ? t("ofertas.remotoDonde", { donde: texto }) : t("modalidades.remoto");
  }
  const sitio = oferta.ciudad ?? (oferta.pais ? new Intl.DisplayNames([locale], { type: "region" }).of(oferta.pais) : null);
  return [sitio, t(`modalidades.${oferta.modalidad}`)].filter(Boolean).join(" · ");
}

/** "38.000 – 46.000 €", o null si la oferta no lo dice. */
export function useSalario(oferta: OfertaListado): string | null {
  const format = useFormatter();
  const moneda = oferta.salario?.moneda;
  if (!moneda) return null;
  const cifras = [oferta.salario!.min, oferta.salario!.max].filter((n): n is number => n != null);
  if (!cifras.length) return null;
  return cifras.map((n) => format.number(n, { style: "currency", currency: moneda, maximumFractionDigits: 0 })).join(" – ");
}

/** "EN B2 · ES": los idiomas que pide, en corto. */
export function codigosIdiomas(oferta: OfertaListado): string {
  return oferta.idiomasRequeridos
    .map(({ idioma, nivel }) => [idioma.toUpperCase(), nivel && nivel !== "nativo" ? nivel.toUpperCase() : null].filter(Boolean).join(" "))
    .join(" · ");
}
