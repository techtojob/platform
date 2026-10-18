import { TECNOLOGIAS, type OfertaListado } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { nombreIdioma } from "@/lib/idiomas-usuario";

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const ZONAS_REMOTO = ["es", "eu", "latam", "mundo"] as const;

/** Una oferta en el listado. Solo pinta: los datos llegan ya preparados del API. */
export function TarjetaOferta({ oferta }: { oferta: OfertaListado }) {
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

  const salario = oferta.salario?.moneda
    ? [oferta.salario.min, oferta.salario.max]
        .filter((n): n is number => n != null)
        .map((n) => format.number(n, { style: "currency", currency: oferta.salario!.moneda!, maximumFractionDigits: 0 }))
        .join(" – ")
    : null;

  return (
    <Tarjeta className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-white/70">{oferta.empresa.nombre}</p>
        <p className="text-sm text-white/55">
          {t("ofertas.publicada", { tiempo: format.relativeTime(new Date(oferta.publicadaEn)) })}
        </p>
      </div>

      <h2 className="text-titulo-3 font-bold">
        <Link
          href={{ pathname: "/ofertas/[slug]", params: { slug: `${oferta.slug}-${oferta.id}` } }}
          className="hover:text-primary"
        >
          {oferta.titulo}
        </Link>
      </h2>

      {oferta.resumen && <p className="max-w-[65ch] text-white/80">{oferta.resumen}</p>}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
        {lugar && <span>{lugar}</span>}
        {zona && <span>{t("ofertas.remotoDesde", { zona: t(`regiones.${zona}`) })}</span>}
        {salario && <span className="font-bold text-white">{salario}</span>}
      </p>

      <div className="flex flex-wrap gap-2">
        <Etiqueta tono="postit">{t(`seniority.${oferta.seniority}`)}</Etiqueta>
        <Etiqueta>{t(`modalidades.${oferta.modalidad}`)}</Etiqueta>
        {oferta.tecnologias.map((id) => (
          <Etiqueta key={id} tono="primario">
            {nombresTecnologias.get(id) ?? id}
          </Etiqueta>
        ))}
      </div>

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
    </Tarjeta>
  );
}
