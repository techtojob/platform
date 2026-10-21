import { ESTADOS_RECRUITER, type EstadoRecruiter } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { AccionesRecruiter } from "@/components/staff/acciones-recruiter";
import { Etiqueta, Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { exigirStaff, listarRecruitersStaff } from "@/lib/api-staff";
import { cn } from "@/lib/cn";

/** Recruiters: se registran solos y solo ellos (y el staff) publican ofertas desde la web. Aquí se bloquean o se marcan como agencia. */
export default function PaginaRecruiters({ searchParams }: PageProps<"/[locale]/staff/recruiters">) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.recruiters.pestana") }]}
        titulo={t("staff.recruiters.titulo")}
        entradilla={t("staff.recruiters.entradilla")}
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

async function Lista({ searchParams }: Pick<PageProps<"/[locale]/staff/recruiters">, "searchParams">) {
  await exigirStaff();
  const { estado: pedido } = await searchParams;
  const estado: EstadoRecruiter = (ESTADOS_RECRUITER as readonly string[]).includes(pedido as string) ? (pedido as EstadoRecruiter) : "activo";
  const [lista, t, format] = await Promise.all([listarRecruitersStaff(estado), getTranslations(), getFormatter()]);
  const fecha = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t("staff.recruiters.titulo")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ESTADOS_RECRUITER.map((e) => {
          const activo = e === estado;
          return (
            <Link
              key={e}
              href={{ pathname: "/staff/recruiters", query: e === "activo" ? {} : { estado: e } }}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                activo ? "bg-acento text-ink" : "bg-chip text-texto hover:bg-hover",
              )}
            >
              {t(`staff.recruiters.estados.${e}`)}
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", activo ? "bg-ink/15" : "bg-fondo/60 text-suave")}>
                {lista.cuentas[e] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      {!lista.recruiters.length ? (
        <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">{t("staff.recruiters.vacio")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.recruiters.map((r) => (
            <li key={r.usuario.id}>
              <Tarjeta className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-lg font-bold">
                      {r.usuario.nombre} <span className="text-sm font-normal text-suave">· {t(`recruiter.cargos.${r.cargo}`)}</span>
                    </p>
                    <p className="text-sm text-suave">{r.usuario.email}</p>
                  </div>
                  <p className="flex flex-wrap gap-1.5">
                    <Etiqueta tono={r.emailEmpresa ? "acento" : "borde"}>
                      {r.emailEmpresa ? t("staff.recruiters.emailEmpresa") : t("staff.recruiters.emailOtro")}
                    </Etiqueta>
                    {r.agencia && <Etiqueta tono="postit">{t("staff.recruiters.agencia")}</Etiqueta>}
                  </p>
                </div>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                  <dt className="font-bold">{t("staff.recruiters.empresa")}</dt>
                  <dd>
                    {r.web ? (
                      <a href={r.web} target="_blank" rel="noopener noreferrer" className="font-bold text-enlace underline">
                        {r.empresa}
                      </a>
                    ) : (
                      r.empresa
                    )}
                  </dd>
                  <dt className="font-bold">LinkedIn</dt>
                  <dd className="truncate">
                    <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="text-enlace underline">
                      {r.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </dd>
                  <dt className="font-bold">{t("staff.recruiters.registrado")}</dt>
                  <dd>
                    {fecha(r.creadoEn)} · {t("staff.recruiters.ofertas", { count: r.ofertas })}
                  </dd>
                </dl>
                {r.mensaje && <blockquote className="rounded-2xl bg-postit px-4 py-3 text-sm font-bold text-ink">{r.mensaje}</blockquote>}
                {r.motivo && (
                  <p className="rounded-2xl border border-peligro p-3 text-sm">
                    <span className="font-bold">{t("staff.recruiters.motivo")}</span> {r.motivo}
                  </p>
                )}
                <AccionesRecruiter userId={r.usuario.id} estado={r.estado} agencia={r.agencia} />
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
