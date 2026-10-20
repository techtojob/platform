import { NOMBRES_ATS, enlaceAts, type EmpresaStaff } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Portada } from "@/components/sitio/portada";
import { AjustesEmpresa, NuevaEmpresa, SugerirEmpresas } from "@/components/staff/empresas";
import { AvatarBlob, Etiqueta, Tarjeta } from "@/components/ui";
import { exigirStaff, listarEmpresas, resumenCandidatas } from "@/lib/api-staff";

/**
 * Empresas: las que tienen página de empleo en Greenhouse, Lever, Ashby, Teamtailor o Personio se leen cada mañana
 * (ver .github/workflows/ofertas.yml) y sus ofertas nuevas entran pendientes.
 */
export default function PaginaEmpresas() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.empresas.pestana") }]}
        titulo={t("staff.empresas.titulo")}
        entradilla={t("staff.empresas.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto flex max-w-[64rem] flex-col gap-8">
          <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido() {
  await exigirStaff();
  const [empresas, candidatas, t] = await Promise.all([listarEmpresas(), resumenCandidatas(), getTranslations("staff.empresas")]);
  const conAts = empresas.filter((e) => e.ats);
  const sinAts = empresas.filter((e) => !e.ats);
  return (
    <>
      <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight">{t("descubrir.titulo")}</h2>
          <p className="text-sm text-suave">{t("descubrir.ayuda")}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["pendiente", "encontrada", "sin_ofertas", "no_existe"] as const).map((estado) => (
            <div key={estado} className="flex flex-col-reverse justify-end gap-1 rounded-2xl bg-chip px-4 py-3">
              <dt className="text-xs font-bold text-suave">{t(`descubrir.${estado}`)}</dt>
              <dd className="text-2xl font-bold tabular-nums">{candidatas[estado]}</dd>
            </div>
          ))}
        </dl>
        <SugerirEmpresas />
      </Tarjeta>
      <NuevaEmpresa />
      {empresas.length === 0 && <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">{t("vacio")}</p>}
      {[
        [t("conAts"), conAts],
        [t("sinAts"), sinAts],
      ].map(([titulo, lista]) =>
        (lista as EmpresaStaff[]).length ? (
          <section key={titulo as string} className="flex flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight">
              {titulo as string} <span className="text-suave">· {(lista as EmpresaStaff[]).length}</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {(lista as EmpresaStaff[]).map((e) => (
                <li key={e.id}>
                  <FilaEmpresa empresa={e} />
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </>
  );
}

async function FilaEmpresa({ empresa: e }: { empresa: EmpresaStaff }) {
  const [t, format, ahora] = await Promise.all([getTranslations("staff.empresas"), getFormatter(), getNow()]);
  return (
    <Tarjeta className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <AvatarBlob nombre={e.nombre} tamano={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-lg font-bold leading-snug">
            {e.nombre} <span className="text-sm font-normal text-suave">· {t("ofertas", { count: e.ofertas })}</span>
          </p>
          {e.ats && e.atsId && (
            <a
              href={enlaceAts(e.ats, e.atsId, e.atsRegion)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit break-all text-sm font-bold text-enlace underline"
            >
              {NOMBRES_ATS[e.ats]} · {e.atsId} ↗
            </a>
          )}
        </div>
        {e.origen === "descubierta" && <Etiqueta tono="borde">{t("descubierta")}</Etiqueta>}
        {e.bloqueada && <Etiqueta tono="postit">{t("bloqueada")}</Etiqueta>}
      </div>
      {e.ats && !e.bloqueada && (
        <p className="text-sm text-suave">
          {e.ultimaLectura ? t("leida", { tiempo: format.relativeTime(new Date(e.ultimaLectura), ahora) }) : t("sinLeer")}
        </p>
      )}
      {e.ultimoError && <p className="rounded-2xl border border-peligro px-4 py-3 text-sm font-bold">{t("error", { error: e.ultimoError })}</p>}
      <AjustesEmpresa empresa={e} />
    </Tarjeta>
  );
}
