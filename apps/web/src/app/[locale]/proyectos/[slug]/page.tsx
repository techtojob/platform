import { TECNOLOGIAS, type ProyectoListado } from "@techtojob/shared";
import type { Metadata } from "next";
import { useFormatter, useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonMegusta } from "@/components/proyectos/boton-megusta";
import { PortadaProyecto } from "@/components/proyectos/portada-proyecto";
import { ReportarProyecto } from "@/components/proyectos/reportar-proyecto";
import { Portada } from "@/components/sitio/portada";
import { AvatarPerfil } from "@/components/talento/avatar-perfil";
import { Aviso, clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { obtenerProyecto, tieneCookieDeSesion } from "@/lib/api";
import { separarSlug } from "@/lib/ofertas";
import { slugDeProyecto } from "@/lib/filtros-proyectos";

type Props = PageProps<"/[locale]/proyectos/[slug]">;
const nombresTec = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await obtenerProyecto(separarSlug(slug).id, (await headers()).get("cookie")).catch(() => null);
  if (!p) return { robots: { index: false } };
  return {
    title: `${p.titulo} · ${p.autor.nombre} – TechToJob`,
    description: p.descripcion.slice(0, 160),
    ...(p.portada && { openGraph: { images: [p.portada] } }),
    ...(p.oculto && { robots: { index: false } }),
  };
}

/** Un proyecto: /empleo/proyectos/<slug>-<id>. */
export default function PaginaProyecto({ params }: Props) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Suspense fallback={<div aria-busy="true" className="fondo-portada h-[30rem] animate-pulse" />}>
        <Cargar params={params} />
      </Suspense>
    </main>
  );
}

async function Cargar({ params }: Pick<Props, "params">) {
  const [{ slug }, cabeceras, locale] = await Promise.all([params, headers(), getLocale()]);
  const cookie = cabeceras.get("cookie");
  const proyecto = await obtenerProyecto(separarSlug(slug).id, cookie);
  if (!proyecto) notFound();
  // Si cambió el título, a la dirección buena.
  if (slug !== slugDeProyecto(proyecto)) redirect({ href: { pathname: "/proyectos/[slug]", params: { slug: slugDeProyecto(proyecto) } }, locale });
  return <Ficha proyecto={proyecto} conSesion={!!cookie && tieneCookieDeSesion(cookie)} />;
}

function Ficha({ proyecto: p, conSesion }: { proyecto: ProyectoListado; conSesion: boolean }) {
  const t = useTranslations();
  const format = useFormatter();
  const enlaces = (
    [
      ["repo", t("proyectos.enlaces.repo")],
      ["demo", t("proyectos.enlaces.demo")],
      ["video", t("proyectos.enlaces.video")],
    ] as const
  ).filter(([clave]) => p[clave]);
  const parrafos = p.descripcion.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);

  return (
    <>
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("proyectos.titulo"), href: "/proyectos" }, { texto: p.titulo }]}
        titulo={p.titulo}
        entradilla={t("proyectos.de", { nombre: p.autor.nombre })}
        compacta
      >
        <p className="mt-6 flex flex-wrap items-center gap-2">
          <Etiqueta tono="borde" className="py-2">{t(`areas.${p.area}`)}</Etiqueta>
          <Etiqueta tono="borde" className="py-2">{t(`proyectos.estados.${p.estado}`)}</Etiqueta>
          <span className="text-sm font-bold text-suave">{t("proyectos.subido", { fecha: format.dateTime(new Date(p.creadoEn), { day: "numeric", month: "long", year: "numeric" }) })}</span>
        </p>
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] pb-20 pt-12">
        <div className="mx-auto grid max-w-[80rem] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {p.oculto && (
              <p role="status" className="rounded-tarjeta border border-peligro bg-tarjeta p-5 font-bold text-peligro">
                {t("proyectos.ocultoAviso")}
              </p>
            )}
            {p.esMio && (
              <Aviso className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-bold">{t("proyectos.esMio")}</p>
                <Link href={{ pathname: "/cuenta/proyectos/[id]/editar", params: { id: p.id } }} className={clasesBoton({ variante: "sobrePostit" })}>
                  {t("proyectos.editar")}
                </Link>
              </Aviso>
            )}
            <Tarjeta className="overflow-hidden p-0">
              <PortadaProyecto portada={p.portada} titulo={p.titulo} area={p.area} />
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <div className="flex max-w-[68ch] flex-col gap-4 leading-relaxed text-suave">
                  {parrafos.map((x, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {x}
                    </p>
                  ))}
                </div>
                {p.tecnologias.length > 0 && (
                  <div className="flex flex-col gap-3 border-t border-borde pt-5">
                    <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("proyectos.tecnologias")}</h2>
                    <p className="flex flex-wrap gap-1.5">
                      {p.tecnologias.map((id) => (
                        <Link key={id} href={{ pathname: "/proyectos", query: { orden: "siempre", tec: id } }} className="rounded-full hover:brightness-110">
                          <Etiqueta>{nombresTec.get(id) ?? id}</Etiqueta>
                        </Link>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            </Tarjeta>
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-col gap-3 rounded-tarjeta bg-acento p-6 text-ink shadow-tarjeta">
              <BotonMegusta id={p.id} megusta={p.megusta} meGusta={p.meGusta} conSesion={conSesion} esMio={p.esMio} grande />
              {!conSesion && !p.esMio && <p className="text-sm text-ink/80">{t("proyectos.megusta.entraTexto")}</p>}
              {enlaces.map(([clave, nombre]) => (
                <a key={clave} href={p[clave]!} target="_blank" rel="noopener noreferrer nofollow" className={clasesBoton({ variante: "sobreAcento", className: "w-full justify-between" })}>
                  {nombre}
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                  <span className="sr-only"> ({t("ofertas.abreOtraWeb")})</span>
                </a>
              ))}
            </div>
            <Link
              href={{ pathname: "/talento/[alias]", params: { alias: p.autor.alias } }}
              className="group flex items-center gap-4 rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta hover:border-acento/60 hover:bg-tarjeta-hover"
            >
              <AvatarPerfil nombre={p.autor.nombre} imagen={p.autor.imagen} disponibilidad={p.autor.disponibilidad} tamano={56} />
              <span className="flex min-w-0 flex-col">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("proyectos.autor")}</span>
                <span className="truncate text-lg font-bold group-hover:text-enlace group-hover:underline">{p.autor.nombre}</span>
                <span className="text-sm font-bold text-enlace">{t("proyectos.verPerfil")}</span>
              </span>
            </Link>
            {!p.esMio && <ReportarProyecto id={p.id} conSesion={conSesion} />}
          </aside>
        </div>
      </section>
    </>
  );
}
