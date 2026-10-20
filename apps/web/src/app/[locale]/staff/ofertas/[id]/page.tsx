import { NOMBRES_ATS, TECNOLOGIAS, type OfertaStaff } from "@techtojob/shared";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { useLugarCorto, useSalario } from "@/components/ofertas/datos-oferta";
import { AccionesOferta } from "@/components/staff/acciones-oferta";
import { Portada } from "@/components/sitio/portada";
import { AvatarBlob, clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { exigirStaff, obtenerOfertaStaff } from "@/lib/api-staff";
import { nombreIdioma } from "@/lib/idiomas-usuario";
import { slugDeOferta } from "@/lib/ofertas";
import { hacerAccion } from "../../acciones";

type Props = PageProps<"/[locale]/staff/ofertas/[id]">;

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

/** Una oferta en el panel: cómo se verá y qué hacer con ella (publicar, rechazar, alargar, cerrar, editar). */
export default function PaginaOfertaStaff({ params }: Props) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Suspense fallback={<div aria-busy="true" className="fondo-portada h-[36rem] animate-pulse" />}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params }: Pick<Props, "params">) {
  await exigirStaff();
  const { id } = await params;
  const [oferta, t, format, ahora] = await Promise.all([obtenerOfertaStaff(id), getTranslations(), getFormatter(), getNow()]);
  if (!oferta) notFound();
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
            {oferta.estado === "rechazada" && oferta.motivoRechazo && (
              <p className="rounded-tarjeta border border-peligro bg-tarjeta p-5 font-bold">
                {t("staff.lista.motivo", { motivo: oferta.motivoRechazo })}
              </p>
            )}
            <VistaPrevia oferta={oferta} />
            {oferta.origen === "automatica" && <TextoOriginal oferta={oferta} />}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <AccionesOferta oferta={oferta} accion={hacerAccion.bind(null, oferta.id)} />
            <Link
              href={{ pathname: "/staff/ofertas/[id]/editar", params: { id: oferta.id } }}
              className={clasesBoton({ variante: "secundario", className: "w-full" })}
            >
              {t("staff.editar")}
            </Link>
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
  const parrafos = (oferta.descripcion ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

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
      <div className="flex max-w-[68ch] flex-col gap-4 border-t border-borde pt-6 leading-relaxed" lang={oferta.idioma}>
        {oferta.resumen && <p className="text-xl font-bold leading-snug tracking-tight">{oferta.resumen}</p>}
        {parrafos.map((p, i) => (
          <p key={i} className="whitespace-pre-line text-suave">
            {p}
          </p>
        ))}
        {!oferta.resumen && parrafos.length === 0 && <p className="text-suave">{t("staff.detalle.sinDescripcion")}</p>}
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
