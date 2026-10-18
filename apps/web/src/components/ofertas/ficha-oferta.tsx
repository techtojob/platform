import { TECNOLOGIAS, type Idioma, type OfertaDetalle, type OfertaListado } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Aviso, clasesBoton, Etiqueta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { nombreIdioma } from "@/lib/idiomas-usuario";
import { CopiarEnlace } from "./copiar-enlace";
import { useLugarCorto, useSalario } from "./datos-oferta";
import { FilaOferta } from "./fila-oferta";

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

type Props = {
  oferta: OfertaDetalle;
  /** Idiomas que habla quien la mira: para marcar "lo hablas" o avisar. */
  hablo: Idioma[];
  parecidas: OfertaListado[];
  ahora: number;
};

/**
 * Una oferta entera. Solo pinta: los datos llegan ya calculados de la página.
 * Arriba lo que pide (lo que puede descartarte), luego la descripción y ofertas parecidas.
 * El botón de aplicar va a la derecha en el ordenador y fijo abajo en el móvil.
 */
export function FichaOferta({ oferta, hablo, parecidas, ahora }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const lugar = useLugarCorto(oferta);
  const salario = useSalario(oferta);

  const faltan = oferta.idiomasRequeridos.map((r) => r.idioma).filter((i) => !hablo.includes(i));
  const listaFaltan = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    faltan.map((i) => nombreIdioma(i, locale, { enFrase: true })),
  );
  // Párrafos separados por una línea en blanco.
  const parrafos = (oferta.descripcion ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const aplicar = (
    <a
      href={oferta.urlOriginal}
      target="_blank"
      rel="noopener noreferrer"
      className={clasesBoton({ tamano: "lg", className: "w-full" })}
    >
      {t("ofertas.aplicar")}
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
      <span className="sr-only"> ({t("ofertas.abreOtraWeb")})</span>
    </a>
  );

  return (
    <div className="flex flex-col gap-6 pb-32 lg:pb-0">
      <Link href="/" className="flex min-h-9 items-center gap-1.5 self-start text-[0.9375rem] font-semibold text-enlace hover:underline">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t("ofertas.volver")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <article className="flex min-w-0 flex-col gap-7">
          <header className="flex flex-col gap-2.5">
            <p className="flex flex-wrap items-center gap-2.5 font-semibold text-suave">
              {oferta.empresa.web ? (
                <a href={oferta.empresa.web} target="_blank" rel="noopener noreferrer" className="text-texto hover:text-enlace">
                  {oferta.empresa.nombre}
                </a>
              ) : (
                <span className="text-texto">{oferta.empresa.nombre}</span>
              )}
              {oferta.idioma !== locale && (
                <Etiqueta>{t("ofertas.escritaEn", { idioma: nombreIdioma(oferta.idioma, locale, { enFrase: true }) })}</Etiqueta>
              )}
            </p>
            <h1 className="text-titulo-1 font-bold" lang={oferta.idioma}>
              {oferta.titulo}
            </h1>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-suave">
              <span>{lugar}</span>
              {salario && <span className="font-semibold text-texto">{t("ofertas.salarioAnual", { salario })}</span>}
              <span>{t("ofertas.publicada", { tiempo: format.relativeTime(new Date(oferta.publicadaEn), ahora) })}</span>
            </p>
          </header>

          <section aria-labelledby="lo-que-pide" className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-5">
            <h2 id="lo-que-pide" className="font-sans text-[0.8125rem] font-semibold uppercase tracking-wider text-suave">
              {t("ofertas.loQuePide")}
            </h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-suave">{t("ofertas.idiomas")}</dt>
                {oferta.idiomasRequeridos.map(({ idioma, nivel }) => (
                  <dd key={idioma} className="font-semibold">
                    {nombreIdioma(idioma, locale)}
                    {nivel && ` ${nivel === "nativo" ? t("ofertas.nativo") : nivel.toUpperCase()}`}{" "}
                    {hablo.includes(idioma) ? (
                      <span className="font-medium text-enlace">· {t("ofertas.loHablas")}</span>
                    ) : (
                      <span className="font-medium text-suave">· {t("ofertas.noLoHablas")}</span>
                    )}
                  </dd>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-suave">{t("filtros.nivel")}</dt>
                <dd className="font-semibold">{t(`seniority.${oferta.seniority}`)}</dd>
              </div>
              {oferta.tecnologias.length > 0 && (
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-suave">{t("ofertas.tecnologias")}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {oferta.tecnologias.map((id) => (
                      <Etiqueta key={id}>{nombresTecnologias.get(id) ?? id}</Etiqueta>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {faltan.length > 0 && (
            <Aviso role="note">
              <p className="font-semibold">{t("ofertas.faltanIdiomas", { idiomas: listaFaltan, count: faltan.length })}</p>
            </Aviso>
          )}

          <div className="flex max-w-[68ch] flex-col gap-4 leading-relaxed" lang={oferta.idioma}>
            {oferta.resumen && <p className="text-lg font-semibold">{oferta.resumen}</p>}
            {parrafos.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
            {!oferta.resumen && parrafos.length === 0 && <p>{t("ofertas.sinDescripcion")}</p>}
          </div>

          {parecidas.length > 0 && (
            <section aria-labelledby="parecidas" className="flex flex-col gap-3">
              <h2 id="parecidas" className="text-titulo-3 font-semibold">
                {t("ofertas.parecidas")}
              </h2>
              <ul className="divide-y divide-borde overflow-hidden rounded-tarjeta border border-borde bg-superficie">
                {parecidas.map((o) => (
                  <li key={o.id}>
                    <FilaOferta oferta={o} ahora={ahora} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        {/* Ordenador: tarjeta para aplicar, fija al bajar */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5">
            {aplicar}
            <p className="text-sm text-suave">{t("ofertas.aplicarAyuda", { empresa: oferta.empresa.nombre })}</p>
            <hr className="border-borde" />
            <CopiarEnlace />
            <p className="text-[0.8125rem] text-suave">{t("ofertas.revisada")}</p>
          </div>
        </aside>
      </div>

      {/* Móvil: barra fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 border-t border-borde bg-superficie px-4 pb-5 pt-3 lg:hidden">
        {aplicar}
        <p className="text-center text-xs text-suave">{t("ofertas.aplicarAyudaCorta")}</p>
      </div>
    </div>
  );
}
