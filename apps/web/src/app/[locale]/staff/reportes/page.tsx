import { useTranslations } from "next-intl";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { BotonesReporte } from "@/components/staff/botones-reporte";
import { BotonesReporteDe } from "@/components/staff/botones-reporte-de";
import { Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { exigirStaff, listarReportes, listarReportesOfertas, listarReportesProyectos, listarReportesRecruiters, resumenReportes } from "@/lib/api-staff";
import { cn } from "@/lib/cn";
import { slugDeOferta } from "@/lib/ofertas";

const PESTANAS = ["perfiles", "ofertas", "recruiters", "proyectos"] as const;
type Pestana = (typeof PESTANAS)[number];

/** Reportes de la comunidad: perfiles, ofertas, recruiters y proyectos, para que el staff los revise. */
export default function PaginaReportes({ searchParams }: PageProps<"/[locale]/staff/reportes">) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.reportes.pestana") }]}
        titulo={t("staff.reportes.titulo")}
        entradilla={t("staff.reportes.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[64rem]">
          <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Lista searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/[locale]/staff/reportes">, "searchParams">) {
  await exigirStaff();
  const { de } = await searchParams;
  const pestana: Pestana = (PESTANAS as readonly string[]).includes(de as string) ? (de as Pestana) : "perfiles";
  const [resumen, t, format, ahora] = await Promise.all([resumenReportes(), getTranslations(), getFormatter(), getNow()]);
  const cuando = (iso: string) => t("staff.reportes.reportado", { tiempo: format.relativeTime(new Date(iso), ahora) });

  const pestanas = (
    <nav aria-label={t("staff.reportes.titulo")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {PESTANAS.map((p) => {
        const activo = p === pestana;
        return (
          <Link
            key={p}
            href={{ pathname: "/staff/reportes", query: p === "perfiles" ? {} : { de: p } }}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
              activo ? "bg-acento text-ink" : "bg-chip text-texto hover:bg-hover",
            )}
          >
            {t(`staff.reportes.de.${p}`)}
            <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", activo ? "bg-ink/15" : resumen[p] ? "bg-peligro text-fondo" : "bg-fondo/60 text-suave")}>
              {resumen[p]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
  const vacio = <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">{t("staff.reportes.vacio")}</p>;

  if (pestana === "ofertas") {
    const reportes = await listarReportesOfertas();
    return (
      <div className="flex flex-col gap-6">
        {pestanas}
        {!reportes.length ? vacio : (
          <ul className="flex flex-col gap-3">
            {reportes.map((r) => (
              <li key={r.id}>
                <Tarjeta className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-bold">
                      {r.oferta.titulo} <span className="text-sm font-normal text-suave">· {r.oferta.empresa}</span>
                    </p>
                    <p className="text-sm text-suave">{cuando(r.creadoEn)}</p>
                  </div>
                  <blockquote className="rounded-2xl bg-postit px-4 py-3 font-bold text-ink">{r.motivo}</blockquote>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap gap-3">
                      {r.oferta.estado === "publicada" && (
                        <Link href={{ pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(r.oferta) } }} className="font-bold text-enlace underline">
                          {t("staff.reportes.verOferta")}
                        </Link>
                      )}
                      <Link href={{ pathname: "/staff/ofertas/[id]", params: { id: r.oferta.id } }} className="font-bold text-enlace underline">
                        {t("staff.reportes.verEnPanel")}
                      </Link>
                      {r.oferta.estado !== "publicada" && <Etiqueta tono="borde">{t(`staff.estados.${r.oferta.estado}`)}</Etiqueta>}
                    </span>
                    <BotonesReporteDe id={r.id} de="ofertas" />
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (pestana === "proyectos") {
    const reportes = await listarReportesProyectos();
    return (
      <div className="flex flex-col gap-6">
        {pestanas}
        {!reportes.length ? vacio : (
          <ul className="flex flex-col gap-3">
            {reportes.map((r) => (
              <li key={r.id}>
                <Tarjeta className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-bold">
                      {r.proyecto.titulo} <span className="text-sm font-normal text-suave">· {r.proyecto.autor.nombre}</span>
                    </p>
                    <p className="text-sm text-suave">{cuando(r.creadoEn)}</p>
                  </div>
                  <blockquote className="rounded-2xl bg-postit px-4 py-3 font-bold text-ink">{r.motivo}</blockquote>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-3">
                      <Link href={{ pathname: "/proyectos/[slug]", params: { slug: `${r.proyecto.slug}-${r.proyecto.id}` } }} className="font-bold text-enlace underline">
                        {t("staff.reportes.verProyecto")}
                      </Link>
                      <Link href={{ pathname: "/talento/[alias]", params: { alias: r.proyecto.autor.alias } }} className="font-bold text-enlace underline">
                        {t("staff.reportes.verPerfil")}
                      </Link>
                      {r.proyecto.oculto && <Etiqueta tono="borde">{t("staff.reportes.oculto")}</Etiqueta>}
                    </span>
                    <BotonesReporteDe id={r.id} de="proyectos" bloqueado={r.proyecto.oculto} />
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (pestana === "recruiters") {
    const reportes = await listarReportesRecruiters();
    return (
      <div className="flex flex-col gap-6">
        {pestanas}
        {!reportes.length ? vacio : (
          <ul className="flex flex-col gap-3">
            {reportes.map((r) => (
              <li key={r.id}>
                <Tarjeta className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-bold">
                      {r.recruiter.nombre} <span className="text-sm font-normal text-suave">· {r.recruiter.empresa} · {r.recruiter.email}</span>
                    </p>
                    <p className="text-sm text-suave">{cuando(r.creadoEn)}</p>
                  </div>
                  <blockquote className="rounded-2xl bg-postit px-4 py-3 font-bold text-ink">{r.motivo}</blockquote>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-3">
                      <Link href="/staff/recruiters" className="font-bold text-enlace underline">
                        {t("staff.recruiters.ver")}
                      </Link>
                      {r.recruiter.estado === "bloqueado" && <Etiqueta tono="borde">{t("staff.recruiters.estados.bloqueado")}</Etiqueta>}
                    </span>
                    <BotonesReporteDe id={r.id} de="recruiters" bloqueado={r.recruiter.estado === "bloqueado"} />
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const reportes = await listarReportes();
  return (
    <div className="flex flex-col gap-6">
      {pestanas}
      {!reportes.length ? vacio : (
        <ul className="flex flex-col gap-3">
          {reportes.map((r) => (
            <li key={r.id}>
              <Tarjeta className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-bold">
                    {r.perfil.nombre} <span className="text-sm font-normal text-suave">· {r.perfil.titular}</span>
                  </p>
                  <p className="text-sm text-suave">{cuando(r.creadoEn)}</p>
                </div>
                <blockquote className="rounded-2xl bg-postit px-4 py-3 font-bold text-ink">{r.motivo}</blockquote>
                <p className="text-sm text-suave">{t("staff.reportes.visibilidad", { visibilidad: t(`visibilidad.${r.perfil.visibilidad}`) })}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={{ pathname: "/talento/[alias]", params: { alias: r.perfil.alias } }} className="font-bold text-enlace underline">
                    {t("staff.reportes.verPerfil")}
                  </Link>
                  <BotonesReporte id={r.id} />
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
