import { leerFiltrosStaff, NOMBRES_ATS, parametrosStaff, TECNOLOGIAS, type OfertaStaff } from "@techtojob/shared";
import { getFormatter, getLocale, getNow, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { useLugarCorto, useSalario } from "@/components/ofertas/datos-oferta";
import { AccionesOferta } from "@/components/staff/acciones-oferta";
import { Portada } from "@/components/sitio/portada";
import { AvatarBlob, clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { CopiarTexto } from "@/components/staff/copiar-texto";
import { promptConOferta, textoParaRedes } from "@/lib/prompt-ia";
import { TextoOferta } from "@/components/ofertas/texto-oferta";
import { LANDING_URL } from "@/lib/sitio";
import { getPathname, Link } from "@/i18n/navigation";
import { exigirStaff, obtenerOfertaStaff, siguienteStaff } from "@/lib/api-staff";
import { nombreIdioma } from "@/lib/idiomas-usuario";
import { slugDeOferta } from "@/lib/ofertas";
import { hacerAccion } from "../../acciones";

type Props = PageProps<"/[locale]/staff/ofertas/[id]">;

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

/** Una oferta en el panel: cómo se verá y qué hacer con ella (publicar, rechazar, alargar, cerrar, editar). */
export default function PaginaOfertaStaff({ params, searchParams }: Props) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Suspense fallback={<div aria-busy="true" className="fondo-portada h-[36rem] animate-pulse" />}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await exigirStaff();
  const [{ id }, parametros] = await Promise.all([params, searchParams]);
  // Los filtros de la lista de la que se viene: para "Volver a la lista" y para revisar en cadena.
  const filtros = leerFiltrosStaff(parametros);
  const lista = parametrosStaff({ ...filtros, pagina: 1 });
  const saltadas = String(parametros.saltadas ?? "").split(",").filter((x) => /^[a-z0-9-]{1,40}$/i.test(x)).slice(-100);
  const hecho = parametros.hecho === "publicar" || parametros.hecho === "rechazar" ? parametros.hecho : null;
  const [oferta, siguiente, t, format, ahora, locale] = await Promise.all([
    obtenerOfertaStaff(id),
    siguienteStaff(filtros, id, saltadas).catch(() => ({ id: null, quedan: 0 })),
    getTranslations(),
    getFormatter(),
    getNow(),
    getLocale(),
  ]);
  if (!oferta) notFound();
  const conSaltadas = (ids: string[]) => ({ ...lista, ...(ids.length && { saltadas: ids.join(",") }) });
  const hace = (iso: string) => format.relativeTime(new Date(iso), ahora);
  const caducada = !!oferta.caducaEn && Date.parse(oferta.caducaEn) < ahora.getTime();

  const fechas = [
    t("staff.lista.creada", { tiempo: hace(oferta.creadaEn) }),
    oferta.publicadaEn && t("staff.detalle.publicada", { tiempo: hace(oferta.publicadaEn) }),
    oferta.estado === "publicada" && oferta.caducaEn &&
      (caducada ? t("staff.lista.caducada", { tiempo: hace(oferta.caducaEn) }) : t("staff.lista.caduca", { tiempo: hace(oferta.caducaEn) })),
  ].filter(Boolean) as string[];

  return (
    <>
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: oferta.titulo }]}
        titulo={oferta.titulo}
        tituloLang={oferta.idioma}
        antesDelTitulo={
          <span className="flex flex-wrap items-center gap-3 font-bold">
            <AvatarBlob nombre={oferta.empresa.nombre} tamano={40} />
            {oferta.empresa.nombre}
            <Etiqueta tono={oferta.estado === "publicada" ? "acento" : "postit"}>{t(`staff.estadoUna.${oferta.estado}`)}</Etiqueta>
            {caducada && <Etiqueta tono="borde">{t("staff.lista.yaNoSale")}</Etiqueta>}
            {oferta.fuenteAts && <Etiqueta tono="borde">{t("staff.detalle.automatica", { fuente: NOMBRES_ATS[oferta.fuenteAts] })}</Etiqueta>}
            {oferta.autorizada && <Etiqueta tono="borde">{t("staff.detalle.autorizada")}</Etiqueta>}
          </span>
        }
        compacta
      >
        <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-suave">
          {fechas.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] pb-20 pt-12">
        <div className="mx-auto grid max-w-[80rem] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Revisar en cadena: volver a la lista, cuántas quedan y saltar a la siguiente. */}
            <nav aria-label={t("staff.titulo")} className="flex flex-wrap items-center justify-between gap-3">
              <Link href={{ pathname: "/staff", query: lista }} className="font-bold text-enlace underline">
                {t("staff.cadena.volver")}
              </Link>
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-suave">{t("staff.cadena.quedan", { count: siguiente.quedan })}</span>
                {siguiente.id && (
                  <Link
                    href={{ pathname: "/staff/ofertas/[id]", params: { id: siguiente.id }, query: conSaltadas([...saltadas, oferta.id]) }}
                    className={clasesBoton({ variante: "secundario" })}
                  >
                    {t("staff.cadena.saltar")}
                  </Link>
                )}
              </span>
            </nav>
            {hecho && (
              <p role="status" className="rounded-tarjeta bg-acento px-5 py-3 font-bold text-ink">
                {t(`staff.cadena.hecho.${hecho}`)}
              </p>
            )}
            {oferta.origen === "usuario" && (
              <div className="flex flex-col gap-1 rounded-tarjeta bg-postit px-5 py-3 text-sm text-ink">
                <p className="font-bold">
                  {oferta.autor
                    ? t("staff.detalle.subidaPor", { nombre: oferta.autor.nombre, email: oferta.autor.email })
                    : t("staff.detalle.subidaPorBorrada")}
                </p>
                {/* Quién es como recruiter: lo que hay que mirar para fiarse de la oferta. */}
                {oferta.autor?.recruiter && (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      {t(`recruiter.cargos.${oferta.autor.recruiter.cargo}`)} · {oferta.autor.recruiter.empresa}
                    </span>
                    <a href={oferta.autor.recruiter.linkedin} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                      LinkedIn
                    </a>
                    <span className="font-bold">
                      {oferta.autor.recruiter.emailEmpresa ? t("staff.recruiters.emailEmpresa") : t("staff.recruiters.emailOtro")}
                    </span>
                    {oferta.autor.recruiter.agencia && <span className="font-bold">{t("staff.recruiters.agencia")}</span>}
                    {oferta.autor.recruiter.estado === "bloqueado" && <span className="font-bold text-peligro">{t("staff.recruiters.estados.bloqueado")}</span>}
                    <Link href={{ pathname: "/staff/recruiters" }} className="underline">
                      {t("staff.recruiters.ver")}
                    </Link>
                  </p>
                )}
              </div>
            )}
            {(oferta.estado === "rechazada" || oferta.estado === "cerrada") && oferta.motivoRechazo && (
              <p className="rounded-tarjeta border border-peligro bg-tarjeta p-5 font-bold">
                {t("staff.lista.motivo", { motivo: oferta.motivoRechazo })}
              </p>
            )}
            <VistaPrevia oferta={oferta} />
            {oferta.origen === "automatica" && <TextoOriginal oferta={oferta} />}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <AccionesOferta
              oferta={oferta}
              accion={hacerAccion.bind(null, oferta.id, siguiente.id ? { id: siguiente.id, query: conSaltadas(saltadas), locale } : null)}
            />
            <Link
              href={{ pathname: "/staff/ofertas/[id]/editar", params: { id: oferta.id } }}
              className={clasesBoton({ variante: "secundario", className: "w-full" })}
            >
              {t("staff.editar")}
            </Link>
            {/* El prompt para la IA con esta oferta ya dentro: se pega en ChatGPT o Claude y sale el resumen. */}
            <CopiarTexto
              variante="secundario"
              className="w-full"
              etiqueta={t("staff.prompt.copiarConOferta")}
              texto={promptConOferta({
                titulo: oferta.titulo,
                empresa: oferta.empresa.nombre,
                texto: oferta.descripcionOriginal || oferta.descripcion || oferta.resumen,
              })}
            />
            {/* Para Discord, LinkedIn…: con los datos de la ficha, sin IA. Enlaza a la oferta en la bolsa si ya está publicada. */}
            <CopiarTexto
              variante="secundario"
              className="w-full"
              etiqueta={t("staff.prompt.copiarParaRedes")}
              texto={textoParaRedes({
                ...oferta,
                empresa: oferta.empresa.nombre,
                nombresTecnologias: (id) => nombresTecnologias.get(id) ?? id,
                enlace:
                  oferta.estado === "publicada"
                    ? `${LANDING_URL}${getPathname({ href: { pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(oferta) } }, locale: "es" })}`
                    : oferta.urlOriginal,
              })}
            />
            {oferta.estado === "publicada" && !caducada && (
              <Link
                href={{ pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(oferta) } }}
                className={clasesBoton({ variante: "fantasma", className: "w-full" })}
              >
                {t("staff.detalle.verEnLaBolsa")}
              </Link>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

/** Los datos de la oferta como los verá la gente, para revisarlos de un vistazo. */
function VistaPrevia({ oferta }: { oferta: OfertaStaff }) {
  const t = useTranslations();
  const locale = useLocale();
  const salarioListado = oferta.moneda ? { min: oferta.salarioMin, max: oferta.salarioMax, moneda: oferta.moneda } : null;
  const lugar = useLugarCorto(oferta as never);
  const salario = useSalario({ salario: salarioListado } as never);
  const datos: Array<[string, React.ReactNode]> = [
    [t("staff.form.area"), t(`areas.${oferta.area}`)],
    [t("staff.form.seniority"), t(`seniority.${oferta.seniority}`)],
    [t("staff.detalle.lugar"), lugar],
    [t("staff.form.seccionSalario"), salario ?? t("staff.detalle.sinSalario")],
    [t("staff.form.idioma"), nombreIdioma(oferta.idioma, locale)],
    [
      t("staff.form.idiomasQuePide"),
      oferta.idiomasRequeridos
        .map(({ idioma, nivel }) => `${nombreIdioma(idioma, locale)}${nivel ? ` ${nivel === "nativo" ? t("ofertas.nativo") : nivel.toUpperCase()}` : ""}`)
        .join(", "),
    ],
  ];

  return (
    <Tarjeta className="flex flex-col gap-6 p-6 sm:p-8">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {datos.map(([dt, dd]) => (
          <div key={dt} className="flex flex-col gap-1 border-t border-borde pt-3">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{dt}</dt>
            <dd className="font-bold">{dd}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 border-t border-borde pt-3 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("staff.form.urlOriginal")}</dt>
          <dd className="break-all font-bold">
            <a href={oferta.urlOriginal} target="_blank" rel="noopener noreferrer" className="enlace-subrayado">
              {oferta.urlOriginal}
            </a>
          </dd>
        </div>
        {oferta.tecnologias.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-borde pt-3 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("staff.form.tecnologias")}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {oferta.tecnologias.map((id) => (
                <Etiqueta key={id}>{nombresTecnologias.get(id) ?? id}</Etiqueta>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <div className="border-t border-borde pt-6">
        {/* Exactamente lo que se publica: la descripción de la empresa, solo si nos autoriza. */}
        <TextoOferta
          resumen={oferta.resumen}
          responsabilidades={oferta.responsabilidades}
          requisitos={oferta.requisitos}
          descripcion={oferta.autorizada ? oferta.descripcion : null}
          idioma={oferta.idioma}
          vacio={t("staff.detalle.sinDescripcion")}
        />
      </div>
    </Tarjeta>
  );
}

/** El texto de la empresa: solo para el staff, para revisar los datos y escribir el resumen. No se publica. */
function TextoOriginal({ oferta }: { oferta: OfertaStaff }) {
  const t = useTranslations("staff.detalle");
  const parrafos = (oferta.descripcionOriginal ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <details open={oferta.estado === "pendiente"} className="group rounded-tarjeta border border-dashed border-borde-fuerte bg-tarjeta/60 p-6 sm:p-8">
      <summary className="cursor-pointer list-none font-bold">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>
          ▸
        </span>
        {t("original")}
      </summary>
      <p className="mt-3 text-sm text-suave">{t("originalAyuda")}</p>
      <div className="mt-5 flex max-h-[32rem] max-w-[68ch] flex-col gap-3 overflow-y-auto border-t border-borde pt-5 text-sm leading-relaxed" lang={oferta.idioma}>
        {parrafos.length ? (
          parrafos.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))
        ) : (
          <p className="text-suave">{t("originalVacio")}</p>
        )}
      </div>
    </details>
  );
}

