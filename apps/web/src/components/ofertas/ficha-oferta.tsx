import { TECNOLOGIAS, type Idioma, type OfertaDetalle, type OfertaListado } from "@techtojob/shared";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Portada } from "@/components/sitio/portada";
import { Aviso, AvatarBlob, clasesBoton, Etiqueta } from "@/components/ui";
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
 * Una oferta entera, con el estilo de la landing. Solo pinta: los datos llegan ya calculados.
 * Arriba la portada (empresa y título). Debajo, el post-it con lo que pide (lo que puede descartarte),
 * la descripción y ofertas parecidas. A la derecha, la tarjeta turquesa para aplicar
 * (en el móvil, una barra fija abajo).
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

  const aplicar = (clase: string) => (
    <a href={oferta.urlOriginal} target="_blank" rel="noopener noreferrer" className={clase}>
      {t("ofertas.aplicar")}
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
      <span className="sr-only"> ({t("ofertas.abreOtraWeb")})</span>
    </a>
  );

  const empresa = (
    <span className="flex flex-wrap items-center gap-3 font-bold">
      <AvatarBlob nombre={oferta.empresa.nombre} tamano={40} />
      {oferta.empresa.web ? (
        <a href={oferta.empresa.web} target="_blank" rel="noopener noreferrer" className="enlace-subrayado">
          {oferta.empresa.nombre}
        </a>
      ) : (
        oferta.empresa.nombre
      )}
      {oferta.idioma !== locale && (
        <Etiqueta>{t("ofertas.escritaEn", { idioma: nombreIdioma(oferta.idioma, locale, { enFrase: true }) })}</Etiqueta>
      )}
    </span>
  );

  return (
    <>
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: oferta.titulo }]}
        titulo={oferta.titulo}
        tituloLang={oferta.idioma}
        antesDelTitulo={empresa}
        compacta
      >
        <p className="mt-6 flex flex-wrap gap-2">
          <Etiqueta tono="borde" className="py-2">{lugar}</Etiqueta>
          {salario && <Etiqueta tono="acento" className="py-2">{t("ofertas.salarioAnual", { salario })}</Etiqueta>}
          <Etiqueta tono="borde" className="py-2">
            {t("ofertas.publicada", { tiempo: format.relativeTime(new Date(oferta.publicadaEn), ahora) })}
          </Etiqueta>
        </p>
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] pb-36 pt-14 lg:pb-20">
        <div className="mx-auto grid max-w-[80rem] gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <article className="flex min-w-0 flex-col gap-10">
            {/* El post-it: lo que pide, lo primero, porque es lo que puede descartarte */}
            <Aviso giro="-rotate-[0.6deg]" className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight">{t("ofertas.loQuePide")}</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 border-t border-ink/15 pt-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink/70">{t("ofertas.idiomas")}</dt>
                  {oferta.idiomasRequeridos.map(({ idioma, nivel }) => (
                    <dd key={idioma} className="flex items-center gap-1.5 font-bold">
                      {hablo.includes(idioma) && (
                        <Image src="/images/check.svg" alt="" width={22} height={26} unoptimized className="h-5 w-auto" />
                      )}
                      {nombreIdioma(idioma, locale)}
                      {nivel && ` ${nivel === "nativo" ? t("ofertas.nativo") : nivel.toUpperCase()}`}
                      <span className="sr-only">
                        {" "}
                        · {hablo.includes(idioma) ? t("ofertas.loHablas") : t("ofertas.noLoHablas")}
                      </span>
                    </dd>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5 border-t border-ink/15 pt-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink/70">{t("filtros.nivel")}</dt>
                  <dd className="font-bold">{t(`seniority.${oferta.seniority}`)}</dd>
                </div>
                {oferta.tecnologias.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-ink/15 pt-3">
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink/70">{t("ofertas.tecnologias")}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {oferta.tecnologias.map((id) => (
                        <span key={id} className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">
                          {nombresTecnologias.get(id) ?? id}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
              {faltan.length > 0 && (
                <p role="note" className="mt-6 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white">
                  {t("ofertas.faltanIdiomas", { idiomas: listaFaltan, count: faltan.length })}
                </p>
              )}
            </Aviso>

            <div className="rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta sm:p-10">
              <div className="flex max-w-[68ch] flex-col gap-4 leading-relaxed" lang={oferta.idioma}>
                {oferta.resumen && <p className="text-xl font-bold leading-snug tracking-tight">{oferta.resumen}</p>}
                {parrafos.map((p, i) => (
                  <p key={i} className="whitespace-pre-line text-suave">
                    {p}
                  </p>
                ))}
                {!oferta.resumen && parrafos.length === 0 && <p className="text-suave">{t("ofertas.sinDescripcion")}</p>}
              </div>
            </div>

            {parecidas.length > 0 && (
              <section aria-labelledby="parecidas" className="flex flex-col gap-4">
                <h2 id="parecidas" className="text-titulo-2 font-bold">
                  {t("ofertas.parecidas")}
                </h2>
                <ul className="flex flex-col gap-3">
                  {parecidas.map((o) => (
                    <li key={o.id}>
                      <FilaOferta oferta={o} ahora={ahora} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          {/* Ordenador: tarjeta turquesa para aplicar, fija al bajar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 flex flex-col gap-5 rounded-tarjeta bg-acento p-7 text-ink shadow-tarjeta">
              <p className="text-2xl font-bold leading-tight tracking-tight">{t("ofertas.teEncaja")}</p>
              {aplicar(clasesBoton({ variante: "sobrePostit", tamano: "lg", className: "w-full" }))}
              <p className="text-sm leading-relaxed text-ink/80">
                {t("ofertas.aplicarAyuda", { empresa: oferta.empresa.nombre })}
              </p>
              <CopiarEnlace variante="sobreAcento" />
              <p className="flex items-center gap-2 border-t border-ink/20 pt-4 text-sm font-bold">
                <Image src="/images/check.svg" alt="" width={22} height={26} unoptimized className="h-5 w-auto" />
                {t("ofertas.revisada")}
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Móvil: barra fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-1.5 border-t border-borde bg-fondo/95 px-4 pb-5 pt-3 backdrop-blur-xl lg:hidden">
        {aplicar(clasesBoton({ tamano: "lg", className: "w-full" }))}
        <p className="text-center text-xs text-suave">{t("ofertas.aplicarAyudaCorta")}</p>
      </div>
    </>
  );
}
