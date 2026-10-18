import { TECNOLOGIAS, type OfertaListado } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Etiqueta } from "@/components/ui";
import { nombreIdioma } from "@/lib/idiomas-usuario";

/** Trozos de una oferta que salen igual en la tarjeta del listado y en la página de la oferta. */

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const ZONAS_REMOTO = ["es", "eu", "latam", "mundo"] as const;

/** "Las Palmas de Gran Canaria, España · Remoto desde Europa · 38.000 € – 46.000 €" */
export function LugarYSalario({ oferta, className }: { oferta: OfertaListado; className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();

  const lugar = [
    oferta.ciudad,
    oferta.pais ? new Intl.DisplayNames([locale], { type: "region" }).of(oferta.pais) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const zona = ZONAS_REMOTO.find((z) => z === oferta.remotoDesde);

  const moneda = oferta.salario?.moneda;
  const salario = moneda
    ? [oferta.salario!.min, oferta.salario!.max]
        .filter((n): n is number => n != null)
        .map((n) => format.number(n, { style: "currency", currency: moneda, maximumFractionDigits: 0 }))
        .join(" – ")
    : null;

  if (!lugar && !zona && !salario) return null;
  return (
    <p className={className ?? "flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75"}>
      {lugar && <span>{lugar}</span>}
      {zona && <span>{t("ofertas.remotoDesde", { zona: t(`regiones.${zona}`) })}</span>}
      {salario && <span className="font-bold text-white">{salario}</span>}
    </p>
  );
}

/** Nivel, modalidad y tecnologías. */
export function EtiquetasOferta({ oferta }: { oferta: OfertaListado }) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap gap-2">
      <Etiqueta tono="postit">{t(`seniority.${oferta.seniority}`)}</Etiqueta>
      <Etiqueta>{t(`modalidades.${oferta.modalidad}`)}</Etiqueta>
      {oferta.tecnologias.map((id) => (
        <Etiqueta key={id} tono="primario">
          {nombresTecnologias.get(id) ?? id}
        </Etiqueta>
      ))}
    </div>
  );
}

/** "Pide: Inglés C1 · Español" */
export function IdiomasRequeridos({ oferta }: { oferta: OfertaListado }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <p className="text-sm text-white/65">
      <span className="font-bold text-white/80">{t("ofertas.pide")}: </span>
      {oferta.idiomasRequeridos
        .map(({ idioma, nivel }) =>
          [nombreIdioma(idioma, locale), nivel && (nivel === "nativo" ? t("ofertas.nativo") : nivel.toUpperCase())]
            .filter(Boolean)
            .join(" "),
        )
        .join(" · ")}
    </p>
  );
}
