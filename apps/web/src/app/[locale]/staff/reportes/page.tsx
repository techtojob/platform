import { useTranslations } from "next-intl";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { BotonesReporte } from "@/components/staff/botones-reporte";
import { Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { exigirStaff, listarReportes } from "@/lib/api-staff";

/** Perfiles reportados por la comunidad, para que el staff los revise. */
export default function PaginaReportes() {
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
            <Lista />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Lista() {
  await exigirStaff();
  const [reportes, t, format, ahora] = await Promise.all([listarReportes(), getTranslations(), getFormatter(), getNow()]);
  if (!reportes.length) return <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">{t("staff.reportes.vacio")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {reportes.map((r) => (
        <li key={r.id}>
          <Tarjeta className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-bold">
                {r.perfil.nombre} <span className="text-sm font-normal text-suave">· {r.perfil.titular}</span>
              </p>
              <p className="text-sm text-suave">{t("staff.reportes.reportado", { tiempo: format.relativeTime(new Date(r.creadoEn), ahora) })}</p>
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
  );
}
