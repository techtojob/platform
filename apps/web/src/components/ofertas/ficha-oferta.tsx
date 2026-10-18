import type { Idioma, OfertaDetalle } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { nombreIdioma } from "@/lib/idiomas-usuario";
import { EtiquetasOferta, IdiomasRequeridos, LugarYSalario } from "./datos-oferta";

/**
 * Una oferta entera. Solo pinta: los datos y los idiomas que faltan
 * llegan ya calculados de la página.
 */
export function FichaOferta({ oferta, faltan }: { oferta: OfertaDetalle; faltan: Idioma[] }) {
  const t = useTranslations("ofertas");
  const locale = useLocale();
  const format = useFormatter();

  // Párrafos separados por una línea en blanco.
  const parrafos = (oferta.descripcion ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const listaFaltan = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    faltan.map((i) => nombreIdioma(i, locale, { enFrase: true })),
  );

  return (
    <article className="flex flex-col gap-8">
      <Link href="/" className="self-start text-sm font-bold text-primary hover:underline">
        ← {t("volver")}
      </Link>

      <header className="flex flex-col gap-4">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-white/75">
          {oferta.empresa.web ? (
            <a href={oferta.empresa.web} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              {oferta.empresa.nombre}
            </a>
          ) : (
            oferta.empresa.nombre
          )}
          {oferta.idioma !== locale && (
            <Etiqueta>{t("escritaEn", { idioma: nombreIdioma(oferta.idioma, locale, { enFrase: true }) })}</Etiqueta>
          )}
        </p>
        <h1 className="text-titulo-1 font-bold" lang={oferta.idioma}>
          {oferta.titulo}
        </h1>
        <LugarYSalario oferta={oferta} className="flex flex-wrap gap-x-5 gap-y-1 text-white/80" />
        <EtiquetasOferta oferta={oferta} />
      </header>

      {faltan.length > 0 && (
        <p role="note" className="rounded-tarjeta bg-postit p-5 font-bold text-ink">
          {t("faltanIdiomas", { idiomas: listaFaltan, count: faltan.length })}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="flex max-w-[65ch] flex-col gap-5 text-white/85" lang={oferta.idioma}>
          {oferta.resumen && <p className="text-lg font-semibold text-white">{oferta.resumen}</p>}
          {parrafos.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
          {!oferta.resumen && parrafos.length === 0 && <p>{t("sinDescripcion")}</p>}
        </div>

        <Tarjeta className="flex flex-col gap-4 lg:sticky lg:top-6">
          <a
            href={oferta.urlOriginal}
            target="_blank"
            rel="noopener noreferrer"
            className={clasesBoton({ tamano: "lg", className: "w-full py-3 text-center" })}
          >
            {t("aplicar")}
            <span className="sr-only"> ({t("abreOtraWeb")})</span>
          </a>
          <p className="text-sm text-white/65">{t("aplicarAyuda", { empresa: oferta.empresa.nombre })}</p>
          <IdiomasRequeridos oferta={oferta} />
          <p className="text-sm text-white/55">
            {t("publicada", { tiempo: format.relativeTime(new Date(oferta.publicadaEn)) })}
          </p>
        </Tarjeta>
      </div>
    </article>
  );
}
