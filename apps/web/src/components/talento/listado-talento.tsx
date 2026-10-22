import { BuscadorTalento } from "./buscador-talento";
import { TECNOLOGIAS } from "@techtojob/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Aviso, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerTalento, tieneCookieDeSesion } from "@/lib/api";
import { aParametrosTalento, alternarTalento, cambiarTalento, cuantosFiltrosTalento, leerFiltrosTalento, PARAMETROS_TALENTO, SIN_FILTROS_TALENTO, type GrupoTalento } from "@/lib/filtros-talento";
import { FiltrosTalento } from "./filtros-talento";
import { TarjetaPerfil } from "./tarjeta-perfil";

const nombresTec = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const TEXTOS: Record<GrupoTalento, string> = { disponibilidad: "disponibilidad", areas: "areas", seniority: "seniority", modalidades: "modalidades", tecnologias: "" };

/** Perfiles según los filtros de la dirección. Con sesión se ven también los de "solo registrados". */
export async function ListadoTalento({ searchParams }: { searchParams: PageProps<"/[locale]/talento">["searchParams"] }) {
  const [t, locale, cabeceras, parametros] = await Promise.all([getTranslations(), getLocale(), headers(), searchParams]);
  const filtros = leerFiltrosTalento(parametros);
  const cookie = cabeceras.get("cookie");
  const conSesion = !!cookie && tieneCookieDeSesion(cookie);

  let r;
  try {
    r = await obtenerTalento(aParametrosTalento(filtros), cookie);
  } catch (error) {
    console.error("No se pudo cargar el talento:", error);
    return (
      <p role="alert" className="rounded-tarjeta border border-peligro bg-tarjeta p-6 font-bold text-peligro">
        {t("talento.error")}
      </p>
    );
  }

  const conFiltros = cuantosFiltrosTalento(filtros) > 0 || !!filtros.q;
  // Chips de los filtros puestos, para quitarlos de uno en uno.
  const chips: Array<{ texto: string; href: Record<string, string> }> = [];
  for (const grupo of Object.keys(PARAMETROS_TALENTO) as GrupoTalento[]) {
    for (const valor of filtros[grupo] as string[]) {
      chips.push({
        texto: grupo === "tecnologias" ? (nombresTec.get(valor) ?? valor) : t(`${TEXTOS[grupo]}.${valor}` as never),
        href: aParametrosTalento(alternarTalento(filtros, grupo, valor)),
      });
    }
  }
  if (filtros.pais) chips.push({ texto: new Intl.DisplayNames([locale], { type: "region" }).of(filtros.pais) ?? filtros.pais, href: aParametrosTalento(cambiarTalento(filtros, { pais: undefined })) });
  if (filtros.verificados) chips.push({ texto: t("talento.soloVerificados"), href: aParametrosTalento(cambiarTalento(filtros, { verificados: undefined })) });

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <FiltrosTalento modo="lateral" filtros={filtros} paises={r.paises} total={r.total} />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        {/* El buscador, encima de los resultados (como en Ofertas). */}
        <BuscadorTalento />
        <h2 className="text-titulo-2 font-bold" aria-live="polite">
          {t("talento.tituloSeccion", { count: r.total })}
        </h2>
        <div className="flex lg:hidden">
          <FiltrosTalento modo="movil" filtros={filtros} paises={r.paises} total={r.total} />
        </div>
        {chips.length > 0 && (
          <ul aria-label={t("filtros.activos")} className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.texto}>
                <ChipQuitableEnlace texto={c.texto} href={c.href} quitar={t("filtros.quitar", { filtro: c.texto })} />
              </li>
            ))}
          </ul>
        )}

        {r.perfiles.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta">
            <p className="font-bold">{conFiltros ? t("talento.vacioConFiltros") : t("talento.vacio")}</p>
            {conFiltros && (
              <Link href={{ pathname: "/talento", query: aParametrosTalento({ ...SIN_FILTROS_TALENTO }) }} className={clasesBoton({ variante: "secundario" })}>
                {t("filtros.limpiar")}
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {r.perfiles.map((p) => (
              <li key={p.alias}>
                <TarjetaPerfil perfil={p} />
              </li>
            ))}
          </ul>
        )}

        {(r.siguiente || filtros.despues) && (
          <nav aria-label={t("talento.paginas")} className="flex flex-wrap gap-3">
            {filtros.despues && (
              <Link href={{ pathname: "/talento", query: aParametrosTalento({ ...filtros, despues: undefined }) }} className={clasesBoton({ variante: "secundario" })}>
                {t("talento.primeraPagina")}
              </Link>
            )}
            {r.siguiente && (
              <Link href={{ pathname: "/talento", query: aParametrosTalento({ ...filtros, despues: r.siguiente }) }} className={clasesBoton({ variante: "secundario" })}>
                {t("talento.masPerfiles")}
              </Link>
            )}
          </nav>
        )}

        {!conSesion && r.ocultosSinSesion > 0 && (
          <Aviso className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold">{t("talento.entraParaVerMas", { count: r.ocultosSinSesion })}</p>
            <Link href="/entrar" className={clasesBoton({ variante: "sobrePostit" })}>
              {t("cuenta.entrar")}
            </Link>
          </Aviso>
        )}
      </div>
    </div>
  );
}

/** Chip de un filtro puesto que, al pulsarlo, lleva a la misma búsqueda sin él. */
function ChipQuitableEnlace({ texto, href, quitar }: { texto: string; href: Record<string, string>; quitar: string }) {
  return (
    <Link href={{ pathname: "/talento", query: href }} aria-label={quitar} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-acento pl-4 pr-3 text-sm font-bold text-ink hover:brightness-105">
      {texto}
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </Link>
  );
}
