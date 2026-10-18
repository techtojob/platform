import type { Idioma } from "@techtojob/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerOfertas } from "@/lib/api";
import { aParametros, hayFiltros, leerFiltros } from "@/lib/filtros";
import { COOKIE_HABLO, idiomasDelUsuario, nombreIdioma } from "@/lib/idiomas-usuario";
import { FiltrosOfertas } from "./filtros-ofertas";
import { AnadirIdioma, IdiomasQueHablo } from "./idiomas-que-hablo";
import { TarjetaOferta } from "./tarjeta-oferta";

/**
 * Listado de ofertas según los idiomas de quien visita y los filtros de la dirección.
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

  let resultado;
  try {
    resultado = await obtenerOfertas({ idiomas, ...filtros });
  } catch (error) {
    console.error("No se pudieron cargar las ofertas:", error);
  }

  const ocultas = resultado ? (Object.entries(resultado.ocultasPorIdioma) as Array<[Idioma, number]>) : [];

  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr] lg:items-start">
      <aside className="lg:sticky lg:top-6">
        <FiltrosOfertas filtros={filtros} />
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <IdiomasQueHablo actuales={idiomas} />

        {!resultado ? (
          <p role="alert" className="rounded-tarjeta border border-peligro/50 p-6 text-peligro">
            {t("ofertas.error")}
          </p>
        ) : (
          <>
            <p className="text-sm font-bold text-suave" aria-live="polite">
              {t("ofertas.total", { count: resultado.total })}
            </p>

            {resultado.ofertas.length === 0 ? (
              <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde p-6 text-texto">
                <p>{hayFiltros(filtros) ? t("ofertas.vacioConFiltros") : t("ofertas.vacio")}</p>
                {hayFiltros(filtros) && (
                  <Link href="/" className={clasesBoton({ variante: "secundario" })}>
                    {t("filtros.limpiar")}
                  </Link>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {resultado.ofertas.map((oferta) => (
                  <li key={oferta.id}>
                    <TarjetaOferta oferta={oferta} />
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
                    className={clasesBoton()}
                  >
                    {t("ofertas.masOfertas")}
                  </Link>
                )}
              </nav>
            )}

            {ocultas.length > 0 && (
              <aside className="flex flex-col gap-3 rounded-tarjeta bg-postit p-6 text-ink">
                {ocultas
                  .sort((a, b) => b[1] - a[1])
                  .map(([idioma, total]) => {
                    const nombre = nombreIdioma(idioma, locale, { enFrase: true });
                    return (
                      <div key={idioma} className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-bold">{t("ofertas.ocultas", { count: total, idioma: nombre })}</p>
                        <AnadirIdioma
                          actuales={idiomas}
                          idioma={idioma}
                          texto={t("ofertas.anadirIdioma", { idioma: nombre })}
                        />
                      </div>
                    );
                  })}
              </aside>
            )}
          </>
        )}
      </div>
    </div>
  );
}
