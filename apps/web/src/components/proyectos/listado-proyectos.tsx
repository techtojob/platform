import { mesDe, TECNOLOGIAS, type FiltrosProyectos as Filtros } from "@techtojob/shared";
import { getFormatter, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerProyectos, tieneCookieDeSesion } from "@/lib/api";
import { aParametrosProyectos, alternarArea, alternarTecnologia, cambiarProyectos, leerFiltrosProyectos, mesesDelRanking } from "@/lib/filtros-proyectos";
import { BuscadorProyectos } from "./buscador-proyectos";
import { ElegirOrden } from "./elegir-orden";
import { FiltrosProyectos } from "./filtros-proyectos";
import { TarjetaProyecto } from "./tarjeta-proyecto";

const nombresTec = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

/** Proyectos según los filtros y el orden de la dirección. */
export async function ListadoProyectos({ searchParams }: { searchParams: PageProps<"/[locale]/proyectos">["searchParams"] }) {
  const [t, format, cabeceras, parametros] = await Promise.all([getTranslations(), getFormatter(), headers(), searchParams]);
  const filtros: Filtros = leerFiltrosProyectos(parametros);
  const cookie = cabeceras.get("cookie");
  const conSesion = !!cookie && tieneCookieDeSesion(cookie);

  let r;
  try {
    r = await obtenerProyectos(aParametrosProyectos(filtros), cookie);
  } catch (error) {
    console.error("No se pudieron cargar los proyectos:", error);
    return (
      <p role="alert" className="rounded-tarjeta border border-peligro bg-tarjeta p-6 font-bold text-peligro">
        {t("proyectos.error")}
      </p>
    );
  }

  const mesActual = mesDe(new Date());
  const periodo =
    filtros.orden === "tendencia"
      ? t("proyectos.periodos.semana")
      : filtros.orden === "mes"
        ? r.mes === mesActual
          ? t("proyectos.periodos.mes")
          : t("proyectos.periodos.enMes", { mes: format.dateTime(new Date(`${r.mes}-15T12:00:00Z`), { month: "long" }) })
        : undefined;
  const conRanking = filtros.orden === "mes" || filtros.orden === "tendencia";
  const conFiltros = filtros.areas.length + filtros.tecnologias.length > 0 || !!filtros.q;

  const chips = [
    ...filtros.areas.map((a) => ({ texto: t(`areas.${a}`), href: aParametrosProyectos(alternarArea(filtros, a)) })),
    ...filtros.tecnologias.map((id) => ({ texto: nombresTec.get(id) ?? id, href: aParametrosProyectos(alternarTecnologia(filtros, id)) })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <FiltrosProyectos modo="lateral" filtros={filtros} total={r.total} />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <BuscadorProyectos />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-titulo-2 font-bold" aria-live="polite">
            {t("proyectos.tituloSeccion", { count: r.total })}
          </h2>
          <div className="flex lg:hidden">
            <FiltrosProyectos modo="movil" filtros={filtros} total={r.total} />
          </div>
        </div>
        <ElegirOrden filtros={filtros} mesActual={mesActual} meses={mesesDelRanking(mesActual)} />
        {chips.length > 0 && (
          <ul aria-label={t("filtros.activos")} className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.texto}>
                <Link
                  href={{ pathname: "/proyectos", query: c.href }}
                  scroll={false}
                  aria-label={t("filtros.quitar", { filtro: c.texto })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-acento pl-4 pr-3 text-sm font-bold text-ink hover:brightness-105"
                >
                  {c.texto}
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {r.proyectos.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta">
            <p className="font-bold">{conFiltros ? t("proyectos.vacioConFiltros") : conRanking ? t("proyectos.vacioRanking") : t("proyectos.vacio")}</p>
            {conFiltros ? (
              <Link href={{ pathname: "/proyectos", query: aParametrosProyectos(cambiarProyectos(filtros, { areas: [], tecnologias: [], q: undefined })) }} className={clasesBoton({ variante: "secundario" })}>
                {t("filtros.limpiar")}
              </Link>
            ) : (
              conRanking && (
                <Link href={{ pathname: "/proyectos", query: { orden: "nuevos" } }} className={clasesBoton({ variante: "secundario" })}>
                  {t("proyectos.verNuevos")}
                </Link>
              )
            )}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {r.proyectos.map((p, i) => (
              <li key={p.id}>
                <TarjetaProyecto
                  proyecto={p}
                  conSesion={conSesion}
                  periodo={periodo}
                  puesto={conRanking && r.pagina === 1 && (p.megustaPeriodo ?? 0) > 0 ? i + 1 : undefined}
                />
              </li>
            ))}
          </ul>
        )}

        {(r.hayMas || r.pagina > 1) && (
          <nav aria-label={t("proyectos.paginas")} className="flex flex-wrap gap-3">
            {r.pagina > 1 && (
              <Link href={{ pathname: "/proyectos", query: aParametrosProyectos({ ...filtros, pagina: r.pagina - 1 }) }} className={clasesBoton({ variante: "secundario" })}>
                {t("proyectos.anteriores")}
              </Link>
            )}
            {r.hayMas && (
              <Link href={{ pathname: "/proyectos", query: aParametrosProyectos({ ...filtros, pagina: r.pagina + 1 }) }} className={clasesBoton({ variante: "secundario" })}>
                {t("proyectos.mas")}
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
