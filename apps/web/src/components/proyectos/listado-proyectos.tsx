import { mesDe, TECNOLOGIAS } from "@techtojob/shared";
import { getFormatter, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerPortfolios, obtenerProyectos, tieneCookieDeSesion } from "@/lib/api";
import { cn } from "@/lib/cn";
import { aParametrosProyectos, alternarArea, alternarTecnologia, cambiarProyectos, leerFiltrosProyectos, mesesDelRanking, type FiltrosVista as Filtros } from "@/lib/filtros-proyectos";
import { BuscadorProyectos } from "./buscador-proyectos";
import { ElegirOrden } from "./elegir-orden";
import { FiltrosProyectos } from "./filtros-proyectos";
import { TarjetaPortfolio } from "./tarjeta-portfolio";
import { TarjetaProyecto } from "./tarjeta-proyecto";

const nombresTec = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

/** Proyectos (o portfolios, con ?ver=portfolios) según los filtros y el orden de la dirección. */
export async function ListadoProyectos({ searchParams }: { searchParams: PageProps<"/[locale]/proyectos">["searchParams"] }) {
  const [t, format, cabeceras, parametros] = await Promise.all([getTranslations(), getFormatter(), headers(), searchParams]);
  const filtros: Filtros = leerFiltrosProyectos(parametros);
  const cookie = cabeceras.get("cookie");
  const conSesion = !!cookie && tieneCookieDeSesion(cookie);

  const verPortfolios = filtros.ver === "portfolios";
  let r;
  try {
    r = verPortfolios
      ? await obtenerPortfolios(aParametrosProyectos(filtros), cookie).then((x) => ({ ...x, elementos: x.portfolios.map((p) => ({ tipo: "portfolio" as const, p })) }))
      : await obtenerProyectos(aParametrosProyectos(filtros), cookie).then((x) => ({ ...x, elementos: x.proyectos.map((p) => ({ tipo: "proyecto" as const, p })) }));
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
  const conFiltros = filtros.areas.length + filtros.tecnologias.length > 0 || !!filtros.q || !!filtros.soloJuicio;

  const chips = [
    ...filtros.areas.map((a) => ({ texto: t(`areas.${a}`), href: aParametrosProyectos(alternarArea(filtros, a)) })),
    ...filtros.tecnologias.map((id) => ({ texto: nombresTec.get(id) ?? id, href: aParametrosProyectos(alternarTecnologia(filtros, id)) })),
    ...(filtros.soloJuicio ? [{ texto: t("portfolios.soloJuicio"), href: aParametrosProyectos(cambiarProyectos(filtros, { soloJuicio: undefined })) }] : []),
  ];
  // Proyectos | Portfolios: al cambiar se quedan el orden, las áreas y la búsqueda.
  const vistas = [
    { ver: undefined, texto: t("proyectos.vistas.proyectos") },
    { ver: "portfolios" as const, texto: t("proyectos.vistas.portfolios") },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <FiltrosProyectos modo="lateral" filtros={filtros} total={r.total} />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <nav aria-label={t("proyectos.vistas.titulo")} className="grid grid-cols-2 gap-1 rounded-full border border-borde bg-tarjeta p-1 sm:max-w-md">
          {vistas.map((v) => {
            const activa = filtros.ver === v.ver;
            return (
              <Link
                key={v.texto}
                href={{ pathname: "/proyectos", query: aParametrosProyectos(cambiarProyectos(filtros, { ver: v.ver, soloJuicio: undefined })) }}
                scroll={false}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold transition-colors",
                  activa ? "bg-acento text-ink" : "text-texto hover:bg-hover",
                )}
              >
                {v.texto}
              </Link>
            );
          })}
        </nav>
        <BuscadorProyectos />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-titulo-2 font-bold" aria-live="polite">
            {verPortfolios ? t("portfolios.tituloSeccion", { count: r.total }) : t("proyectos.tituloSeccion", { count: r.total })}
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

        {r.elementos.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta">
            <p className="font-bold">
              {conFiltros ? t("proyectos.vacioConFiltros") : conRanking ? t("proyectos.vacioRanking") : verPortfolios ? t("portfolios.vacio") : t("proyectos.vacio")}
            </p>
            {conFiltros ? (
              <Link href={{ pathname: "/proyectos", query: aParametrosProyectos(cambiarProyectos(filtros, { areas: [], tecnologias: [], q: undefined, soloJuicio: undefined })) }} className={clasesBoton({ variante: "secundario" })}>
                {t("filtros.limpiar")}
              </Link>
            ) : (
              conRanking && (
                <Link href={{ pathname: "/proyectos", query: aParametrosProyectos(cambiarProyectos(filtros, { orden: "nuevos" })) }} className={clasesBoton({ variante: "secundario" })}>
                  {t("proyectos.verNuevos")}
                </Link>
              )
            )}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {r.elementos.map((e, i) => {
              const puesto = conRanking && r.pagina === 1 && (e.p.megustaPeriodo ?? 0) > 0 ? i + 1 : undefined;
              return e.tipo === "portfolio" ? (
                <li key={e.p.alias} className="min-w-0">
                  <TarjetaPortfolio portfolio={e.p} conSesion={conSesion} periodo={periodo} puesto={puesto} />
                </li>
              ) : (
                <li key={e.p.id} className="min-w-0">
                  <TarjetaProyecto proyecto={e.p} conSesion={conSesion} periodo={periodo} puesto={puesto} />
                </li>
              );
            })}
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
