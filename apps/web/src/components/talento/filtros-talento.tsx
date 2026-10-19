"use client";

import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useRef, useTransition } from "react";
import { Boton, Casilla, Ventana } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import {
  aParametrosTalento,
  alternarTalento,
  cambiarTalento,
  cuantosFiltrosTalento,
  PARAMETROS_TALENTO,
  SIN_FILTROS_TALENTO,
  type FiltrosTalento as Filtros,
} from "@/lib/filtros-talento";

const GRUPOS = [
  { grupo: "disponibilidad", titulo: "disponibilidad", textos: "disponibilidad" },
  { grupo: "areas", titulo: "area", textos: "areas" },
  { grupo: "seniority", titulo: "nivel", textos: "seniority" },
  { grupo: "modalidades", titulo: "modalidad", textos: "modalidades" },
] as const;

type Props = {
  filtros: Filtros;
  /** Países con perfiles, y cuántos hay en cada uno. */
  paises: Record<string, number>;
  total: number;
  modo: "lateral" | "movil";
};

/**
 * Filtros del buscador de talento. Como los de ofertas: cambian la dirección
 * (?disp=buscando&area=…) y el servidor vuelve a pedir los perfiles.
 */
export function FiltrosTalento({ filtros: filtrosDireccion, paises, total, modo }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [filtros, ponerFiltros] = useOptimistic(filtrosDireccion);
  const panel = useRef<HTMLDialogElement>(null);
  const activos = cuantosFiltrosTalento(filtros);
  const nombresPais = new Intl.DisplayNames([locale], { type: "region" });
  const listaPaises = Object.entries(paises).sort((a, b) => b[1] - a[1]);

  function aplicar(nuevos: Filtros) {
    startTransition(() => {
      ponerFiltros(nuevos);
      router.replace({ pathname: "/talento", query: aParametrosTalento(nuevos) }, { scroll: false });
    });
  }
  const quitarTodos = () => aplicar({ ...SIN_FILTROS_TALENTO, q: filtros.q });

  const grupos = (
    <>
      <Casilla
        etiqueta={t("talento.soloVerificados")}
        checked={!!filtros.verificados}
        onChange={() => aplicar(cambiarTalento(filtros, { verificados: !filtros.verificados || undefined }))}
      />
      {GRUPOS.map(({ grupo, titulo, textos }) => (
        <fieldset key={grupo} className="flex flex-col">
          <legend className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-suave">{t(`filtros.${titulo}`)}</legend>
          {PARAMETROS_TALENTO[grupo].valores.map((valor) => (
            <Casilla
              key={valor}
              etiqueta={t(`${textos}.${valor}` as never)}
              checked={(filtros[grupo] as readonly string[]).includes(valor)}
              onChange={() => aplicar(alternarTalento(filtros, grupo, valor))}
            />
          ))}
        </fieldset>
      ))}
      {listaPaises.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`pais-${modo}`} className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-suave">
            {t("talento.pais")}
          </label>
          <select
            id={`pais-${modo}`}
            value={filtros.pais ?? ""}
            onChange={(e) => aplicar(cambiarTalento(filtros, { pais: e.target.value || undefined }))}
            className="min-h-11 rounded-full border border-borde-fuerte bg-tarjeta px-4 text-sm font-bold"
          >
            <option value="">{t("talento.todosLosPaises")}</option>
            {listaPaises.map(([codigo, n]) => (
              <option key={codigo} value={codigo}>
                {nombresPais.of(codigo)} ({n})
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  if (modo === "lateral") {
    return (
      <Ventana
        canal={t("filtros.canal")}
        aria-label={t("filtros.titulo")}
        aria-busy={pendiente}
        className="transition-opacity aria-busy:opacity-60"
        extra={
          activos > 0 && (
            <button type="button" onClick={quitarTodos} className="rounded-full bg-chip px-3 py-1 text-xs font-bold text-texto hover:bg-acento hover:text-ink">
              {t("filtros.limpiar")}
            </button>
          )
        }
      >
        <div className="flex flex-col gap-5 rounded-xl bg-tarjeta/50 p-3">{grupos}</div>
      </Ventana>
    );
  }

  return (
    <>
      <Boton variante="secundario" className="lg:hidden" onClick={() => panel.current?.showModal()} aria-haspopup="dialog">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {activos ? t("filtros.tituloConActivos", { count: activos }) : t("filtros.titulo")}
      </Boton>
      <dialog
        ref={panel}
        aria-labelledby="titulo-filtros-talento"
        onClick={(e) => e.target === panel.current && panel.current.close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none flex-col rounded-t-3xl bg-ventana p-0 text-texto backdrop:bg-black/60 open:flex lg:hidden"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 id="titulo-filtros-talento" className="text-lg font-bold">
            {t("filtros.titulo")}
          </h2>
          {activos > 0 && (
            <button type="button" onClick={quitarTodos} className="min-h-11 px-1 text-sm font-bold text-enlace">
              {t("filtros.limpiar")}
            </button>
          )}
        </div>
        <div aria-busy={pendiente} className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
          {grupos}
        </div>
        <div className="border-t border-borde px-4 pb-6 pt-3">
          <Boton tamano="lg" className="w-full" onClick={() => panel.current?.close()} disabled={pendiente}>
            {t("talento.verPerfiles", { count: total })}
          </Boton>
        </div>
      </dialog>
    </>
  );
}
