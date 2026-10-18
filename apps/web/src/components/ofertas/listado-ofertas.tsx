import type { Idioma } from "@techtojob/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { obtenerOfertas } from "@/lib/api";
import { COOKIE_HABLO, idiomasDelUsuario, nombreIdioma } from "@/lib/idiomas-usuario";
import { AnadirIdioma, IdiomasQueHablo } from "./idiomas-que-hablo";
import { TarjetaOferta } from "./tarjeta-oferta";

/**
 * Listado de ofertas según los idiomas de quien visita. Lee cookies y cabeceras,
 * así que se pinta en cada visita (dentro de un <Suspense>).
 */
export async function ListadoOfertas() {
  const [t, locale, almacen, cabeceras] = await Promise.all([getTranslations(), getLocale(), cookies(), headers()]);

  const idiomas = idiomasDelUsuario({
    cookie: almacen.get(COOKIE_HABLO)?.value,
    acceptLanguage: cabeceras.get("accept-language"),
    idiomaWeb: locale,
  });

  let resultado;
  try {
    resultado = await obtenerOfertas({ idiomas });
  } catch (error) {
    console.error("No se pudieron cargar las ofertas:", error);
    return (
      <div className="flex flex-col gap-6">
        <IdiomasQueHablo actuales={idiomas} />
        <p role="alert" className="rounded-tarjeta border border-peligro/50 p-6 text-peligro">
          {t("ofertas.error")}
        </p>
      </div>
    );
  }

  const ocultas = Object.entries(resultado.ocultasPorIdioma) as Array<[Idioma, number]>;

  return (
    <div className="flex flex-col gap-6">
      <IdiomasQueHablo actuales={idiomas} />

      <p className="text-sm font-bold text-white/70" aria-live="polite">
        {t("ofertas.total", { count: resultado.ofertas.length })}
      </p>

      {resultado.ofertas.length === 0 ? (
        <p className="rounded-tarjeta border border-white/10 p-6 text-white/80">{t("ofertas.vacio")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {resultado.ofertas.map((oferta) => (
            <li key={oferta.id}>
              <TarjetaOferta oferta={oferta} />
            </li>
          ))}
        </ul>
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
                  <AnadirIdioma actuales={idiomas} idioma={idioma} texto={t("ofertas.anadirIdioma", { idioma: nombre })} />
                </div>
              );
            })}
        </aside>
      )}
    </div>
  );
}
