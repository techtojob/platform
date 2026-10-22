import { TECNOLOGIAS, type PerfilPublico } from "@techtojob/shared";
import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { AvatarPerfil } from "@/components/talento/avatar-perfil";
import { useLugarPerfil } from "@/components/talento/datos-perfil";
import { Emblemas, EtiquetaDisponibilidad, Verificado } from "@/components/talento/insignias";
import { ReportarPerfil } from "@/components/talento/reportar-perfil";
import { Aviso, clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerPerfilPublico, tieneCookieDeSesion } from "@/lib/api";
import { nombreIdioma } from "@/lib/idiomas-usuario";

type Props = PageProps<"/[locale]/talento/[alias]">;
const nombresTec = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { alias } = await params;
  const cookie = (await headers()).get("cookie");
  const perfil = await obtenerPerfilPublico(alias, cookie).catch(() => null);
  if (!perfil || perfil === "solo_registrados") return { robots: { index: false } };
  return {
    title: `${perfil.nombre} · ${perfil.titular} – TechToJob`,
    description: perfil.sobreMi?.slice(0, 160) ?? perfil.titular,
    // Solo los públicos pueden salir en buscadores.
    robots: perfil.visibilidad === "publico" ? undefined : { index: false },
  };
}

/** Perfil de una persona de la comunidad: /empleo/talento/<alias>. */
export default function PaginaPerfil({ params }: Props) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Suspense fallback={<div aria-busy="true" className="fondo-portada h-[30rem] animate-pulse" />}>
        <Cargar params={params} />
      </Suspense>
    </main>
  );
}

async function Cargar({ params }: Pick<Props, "params">) {
  const [{ alias }, cabeceras, t] = await Promise.all([params, headers(), getTranslations()]);
  const cookie = cabeceras.get("cookie");
  const perfil = await obtenerPerfilPublico(alias, cookie);
  if (!perfil) notFound();
  if (perfil === "solo_registrados") {
    return (
      <>
        <Portada migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("talento.titulo"), href: "/talento" }]} titulo={t("talento.soloRegistradosTitulo")} compacta />
        <section className="rejilla flex-1 px-[var(--margen)] py-12">
          <Aviso className="mx-auto flex max-w-xl flex-col items-start gap-4 p-7">
            <p className="font-bold">{t("talento.soloRegistradosTexto")}</p>
            <Link href="/entrar" className={clasesBoton({ variante: "sobrePostit" })}>
              {t("cuenta.entrar")}
            </Link>
          </Aviso>
        </section>
      </>
    );
  }
  return <Ficha perfil={perfil} conSesion={!!cookie && tieneCookieDeSesion(cookie)} />;
}

function Ficha({ perfil, conSesion }: { perfil: PerfilPublico; conSesion: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const lugar = useLugarPerfil(perfil);
  const parrafos = (perfil.sobreMi ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const enlaces = (
    [
      ["linkedin", "LinkedIn"],
      ["github", "GitHub"],
      ["portfolio", t("talento.portfolio")],
    ] as const
  ).filter(([clave]) => perfil.enlaces[clave]);

  return (
    <>
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("talento.titulo"), href: "/talento" }, { texto: perfil.nombre }]}
        antesDelTitulo={<AvatarPerfil nombre={perfil.nombre} imagen={perfil.imagen} disponibilidad={perfil.disponibilidad} tamano={96} className="mb-2" />}
        titulo={perfil.nombre}
        entradilla={perfil.titular}
        compacta
      >
        <p className="mt-6 flex flex-wrap items-center gap-2">
          <EtiquetaDisponibilidad disponibilidad={perfil.disponibilidad} className="py-2" />
          <Etiqueta tono="borde" className="py-2">
            {perfil.anosExperiencia
              ? t("talento.nivelConAnos", { nivel: t(`seniority.${perfil.seniority}`), anos: perfil.anosExperiencia })
              : t(`seniority.${perfil.seniority}`)}
          </Etiqueta>
          <Etiqueta tono="borde" className="py-2">{t(`areas.${perfil.area}`)}</Etiqueta>
          {perfil.verificado && <Verificado conTexto className="ml-1" />}
        </p>
        {lugar && <p className="mt-3 font-bold text-suave">{lugar}</p>}
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] pb-20 pt-12">
        <div className="mx-auto grid max-w-[80rem] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {perfil.esMio && (
              <Aviso className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-bold">
                  {t("talento.esMio", { visibilidad: t(`visibilidad.${perfil.visibilidad}`).toLocaleLowerCase(locale) })}
                </p>
                <Link href="/cuenta/perfil" className={clasesBoton({ variante: "sobrePostit" })}>
                  {t("talento.editarMiPerfil")}
                </Link>
              </Aviso>
            )}

            <Tarjeta className="flex flex-col gap-4 p-6 sm:p-8">
              <h2 className="text-titulo-3 font-bold">{t("talento.sobreMi")}</h2>
              {parrafos.length ? (
                <div className="flex max-w-[68ch] flex-col gap-4 leading-relaxed text-suave">
                  {parrafos.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-suave">{t("talento.sinSobreMi")}</p>
              )}
            </Tarjeta>

            <Tarjeta className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("talento.stack")}</h2>
                {perfil.tecnologias.length ? (
                  <p className="flex flex-wrap gap-1.5">
                    {perfil.tecnologias.map((id) => (
                      <Etiqueta key={id}>{nombresTec.get(id) ?? id}</Etiqueta>
                    ))}
                  </p>
                ) : (
                  <p className="text-sm text-suave">—</p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("talento.idiomas")}</h2>
                <ul className="flex flex-col gap-1.5">
                  {perfil.idiomas.map(({ idioma, nivel }) => (
                    <li key={idioma} className="font-bold">
                      {nombreIdioma(idioma, locale)}
                      {nivel && <span className="text-suave"> · {nivel === "nativo" ? t("formulario.nativo") : nivel.toUpperCase()}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </Tarjeta>
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            {enlaces.length > 0 && (
              <div className="flex flex-col gap-3 rounded-tarjeta bg-acento p-6 text-ink shadow-tarjeta">
                <h2 className="text-xl font-bold">{t("talento.enlaces")}</h2>
                {enlaces.map(([clave, nombre]) => (
                  <a
                    key={clave}
                    href={perfil.enlaces[clave]!}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={clasesBoton({ variante: "sobreAcento", className: "w-full justify-between" })}
                  >
                    {nombre}
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                    <span className="sr-only"> ({t("ofertas.abreOtraWeb")})</span>
                  </a>
                ))}
              </div>
            )}
            {perfil.emblemas.length > 0 && (
              <section aria-labelledby="titulo-emblemas" className="flex flex-col gap-3">
                <h2 id="titulo-emblemas" className="text-xs font-bold uppercase tracking-[0.12em] text-suave">
                  {t("talento.emblemasTitulo")}
                </h2>
                <Emblemas emblemas={perfil.emblemas} detalle />
              </section>
            )}
            {!perfil.esMio && <ReportarPerfil alias={perfil.alias} conSesion={conSesion} />}
          </aside>
        </div>
      </section>
    </>
  );
}
