import type { OfertaListado } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";

/** Trozos de una oferta que salen igual en la fila del listado y en la página de la oferta. */

const ZONAS_REMOTO = ["es", "eu", "latam", "mundo"] as const;

/** "Las Palmas de Gran Canaria · Híbrido" o "Remoto (Europa)", para la fila del listado. */
export function useLugarCorto(oferta: OfertaListado): string {
  const t = useTranslations();
  const locale = useLocale();
  const zona = ZONAS_REMOTO.find((z) => z === oferta.remotoDesde);
  if (oferta.modalidad === "remoto") {
    return zona ? t("ofertas.remotoZona", { zona: t(`regiones.${zona}`) }) : t("modalidades.remoto");
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
