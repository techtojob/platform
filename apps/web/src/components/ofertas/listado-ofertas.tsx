import { Buscador } from "@/components/buscador";
import type { Idioma } from "@techtojob/shared";
import { getLocale, getNow, getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { Aviso, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerCuenta, obtenerOfertas } from "@/lib/api";
import { aParametros, hayFiltros, leerFiltros } from "@/lib/filtros";
import { COOKIE_HABLO, idiomasDelUsuario, nombreIdioma } from "@/lib/idiomas-usuario";
import { COOKIE_DESDE, paisDelUsuario } from "@/lib/pais-usuario";
import { FilaOferta } from "./fila-oferta";
import { FiltrosActivos } from "./filtros-activos";
import { FiltrosOfertas } from "./filtros-ofertas";
import { AnadirIdioma, IdiomasQueHablo } from "./idiomas-que-hablo";
import { TrabajoDesde, VerTodosLosPaises } from "./trabajo-desde";

/**
 * Listado de ofertas según los idiomas de quien visita, lo que busca y los filtros de la dirección.
 * Lee cookies, cabeceras y la dirección, así que se pinta en cada visita (dentro de un <Suspense>).
 */
export async function ListadoOfertas({ searchParams }: { searchParams: PageProps<"/[locale]">["searchParams"] }) {
  const [t, locale, almacen, cabeceras, parametros] = await Promise.all([
    getTranslations(),
    getLocale(),
    cookies(),
    headers(),
    searchParams,
  ]);

  const filtros = leerFiltros(parametros);
  const idiomas = idiomasDelUsuario({
    cookie: almacen.get(COOKIE_HABLO)?.value,
    acceptLanguage: cabeceras.get("accept-language"),
    idiomaWeb: locale,
  });
  const desde = paisDelUsuario({
    cookie: almacen.get(COOKIE_DESDE)?.value,
    paisPerfil: almacen.get(COOKIE_DESDE)?.value ? null : (await obtenerCuenta(cabeceras.get("cookie")).catch(() => null))?.pais,
    paisConexion: cabeceras.get("cf-ipcountry"),
  });

  let resultado;
  try {
    resultado = await obtenerOfertas({ idiomas, desde, ...filtros });
  } catch (error) {
    console.error("No se pudieron cargar las ofertas:", error);
  }
  // "Ahora" de esta visita, el mismo para todas las filas (para "Nueva" y "hace 3 h").
  const ahora = (await getNow()).getTime();

  if (!resultado) {
    return (
      <p role="alert" className="rounded-tarjeta border border-peligro bg-tarjeta p-6 font-bold text-peligro">
        {t("ofertas.error")}
      </p>
    );
  }

  const ocultas = (Object.entries(resultado.ocultasPorIdioma) as Array<[Idioma, number]>).sort((a, b) => b[1] - a[1]);
  const conFiltros = hayFiltros(filtros);

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <FiltrosOfertas modo="lateral" filtros={filtros} facetas={resultado.facetas} total={resultado.total} />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        {/* El buscador, encima de los resultados: todo lo que cambia el listado, en la misma columna. */}
        <Buscador />
        <header className="flex flex-col gap-2">
          <h2 className="text-titulo-2 font-bold" aria-live="polite">
            {t("ofertas.tituloSeccion", { count: resultado.total })}
          </h2>
          <IdiomasQueHablo actuales={idiomas} />
          <TrabajoDesde actual={desde} />
        </header>

        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex">
            <FiltrosOfertas modo="movil" filtros={filtros} facetas={resultado.facetas} total={resultado.total} />
          </div>
        </div>

        <FiltrosActivos filtros={filtros} />

        {resultado.ofertas.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta">
            <p className="font-bold">{conFiltros ? t("ofertas.vacioConFiltros") : t("ofertas.vacio")}</p>
            {conFiltros && (
              <Link href="/" className={clasesBoton({ variante: "secundario" })}>
                {t("filtros.limpiar")}
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {resultado.ofertas.map((oferta) => (
              <li key={oferta.id}>
                <FilaOferta oferta={oferta} ahora={ahora} />
              </li>
            ))}
          </ul>
        )}

        {(resultado.siguiente || filtros.despues) && (
          <nav aria-label={t("ofertas.paginas")} className="flex flex-wrap gap-3">
            {filtros.despues && (
              <Link
                href={{ pathname: "/", query: aParametros({ ...filtros, despues: undefined }) }}
                className={clasesBoton({ variante: "secundario" })}
              >
                {t("ofertas.primeraPagina")}
              </Link>
            )}
            {resultado.siguiente && (
              <Link
                href={{ pathname: "/", query: aParametros({ ...filtros, despues: resultado.siguiente }) }}
                className={clasesBoton({ variante: "secundario" })}
              >
                {t("ofertas.masOfertas")}
              </Link>
            )}
          </nav>
        )}

        {desde && resultado.ocultasPorPais > 0 && (
          <Aviso className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold">
              {t("ofertas.ocultasPorPais", {
                count: resultado.ocultasPorPais,
                pais: new Intl.DisplayNames([locale], { type: "region" }).of(desde) ?? desde,
              })}
            </p>
            <VerTodosLosPaises texto={t("ofertas.verTodasPaises")} />
          </Aviso>
        )}

        {ocultas.map(([idioma, total]) => {
          const nombre = nombreIdioma(idioma, locale, { enFrase: true });
          return (
            <Aviso key={idioma} className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">{t("ofertas.ocultas", { count: total, idioma: nombre })}</p>
              <AnadirIdioma actuales={idiomas} idioma={idioma} texto={t("ofertas.anadirIdioma", { idioma: nombre })} />
            </Aviso>
          );
        })}
      </div>
    </div>
  );
}

