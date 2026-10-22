import type { PortfolioJuicioStaff } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { FormularioJuicio } from "@/components/staff/formulario-juicio";
import { Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { exigirStaff, listarJuicio } from "@/lib/api-staff";

/**
 * "Tu portfolio a juicio": los portfolios que han pedido que los revisemos en el directo de los viernes.
 * Se eligen sin orden; al revisarlo se apunta el día y el vídeo, y su autor recibe el emblema.
 */
export default function PaginaJuicio() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.juicio.pestana") }]}
        titulo={t("staff.juicio.titulo")}
        entradilla={t("staff.juicio.entradilla")}
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
  const [{ pendientes, revisados }, t, format, ahora] = await Promise.all([listarJuicio(), getTranslations("staff.juicio"), getFormatter(), getNow()]);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora);
  const fecha = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" });

  const ficha = (p: PortfolioJuicioStaff, pie: React.ReactNode) => (
    <Tarjeta className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-bold">
          <Link href={{ pathname: "/talento/[alias]", params: { alias: p.alias } }} className="hover:text-enlace hover:underline">
            {p.nombre}
          </Link>{" "}
          <span className="text-sm font-normal text-suave">· {t("megusta", { count: p.megusta })}</span>
        </p>
        <p className="text-sm text-suave">
          {p.juicio.estado === "pedido" && t("pedido", { fecha: fecha(p.juicio.pedidoEn) })}
          {p.juicio.estado === "revisado" && t("revisado", { fecha: fecha(p.juicio.revisadoEn) })}
        </p>
      </div>
      <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="self-start font-bold text-enlace underline">
        {p.url}
      </a>
      {p.descripcion && <p className="text-sm text-suave">{p.descripcion}</p>}
      {pie}
    </Tarjeta>
  );

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="pendientes" className="flex flex-col gap-4">
        <h2 id="pendientes" className="text-titulo-3 font-bold">
          {t("pendientes", { count: pendientes.length })}
        </h2>
        {pendientes.length === 0 ? (
          <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">{t("vacio")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendientes.map((p) => (
              <li key={p.alias}>{ficha(p, <FormularioJuicio alias={p.alias} hoy={hoy} />)}</li>
            ))}
          </ul>
        )}
      </section>
      {revisados.length > 0 && (
        <section aria-labelledby="revisados" className="flex flex-col gap-4">
          <h2 id="revisados" className="text-titulo-3 font-bold">
            {t("revisados")}
          </h2>
          <ul className="flex flex-col gap-3">
            {revisados.map((p) => (
              <li key={p.alias}>
                {ficha(
                  p,
                  p.juicio.estado === "revisado" && (
                    <FormularioJuicio alias={p.alias} hoy={hoy} fecha={p.juicio.revisadoEn.slice(0, 10)} video={p.juicio.video} />
                  ),
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
