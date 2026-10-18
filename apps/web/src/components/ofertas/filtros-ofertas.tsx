"use client";

import type { ResultadoOfertas } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useOptimistic, useRef, useTransition } from "react";
import { Boton, Casilla } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { aParametros, alternar, cambiar, cuantosFiltros, PARAMETROS, SIN_FILTROS, type Filtros } from "@/lib/filtros";

/** Grupos de casillas: qué filtro, qué faceta del API y de dónde sale el nombre de cada valor. */
const GRUPOS = [
  { grupo: "areas", faceta: "area", titulo: "area", textos: "areas" },
  { grupo: "seniority", faceta: "seniority", titulo: "nivel", textos: "seniority" },
  { grupo: "modalidades", faceta: "modalidad", titulo: "modalidad", textos: "modalidades" },
] as const;

type Props = {
  filtros: Filtros;
  facetas: ResultadoOfertas["facetas"];
  total: number;
  /** "lateral": la columna del ordenador. "movil": el botón y su panel. */
  modo: "lateral" | "movil";
};

/**
 * Filtros del listado. No guardan nada por su cuenta: cambian la dirección
 * (?area=…&nivel=…) y el servidor vuelve a pedir las ofertas.
 *
 * En el ordenador van en una columna a la izquierda. En el móvil, tras el botón
 * "Filtros (2)", en un panel que sube desde abajo con "Ver 12 ofertas" para cerrarlo.
 */
export function FiltrosOfertas({ filtros: filtrosDireccion, facetas, total, modo }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  // La casilla se marca al momento, sin esperar a que lleguen las ofertas nuevas.
  const [filtros, ponerFiltros] = useOptimistic(filtrosDireccion);
  const panel = useRef<HTMLDialogElement>(null);
  const activos = cuantosFiltros(filtros);

  function aplicar(nuevos: Filtros) {
    startTransition(() => {
      ponerFiltros(nuevos);
      router.replace({ pathname: "/", query: aParametros(nuevos) }, { scroll: false });
    });
  }
  // "Quitar todos" deja el texto buscado: ese se borra en su caja.
  const quitarTodos = () => aplicar({ ...SIN_FILTROS, q: filtros.q });

  const grupos = (
    <>
      {GRUPOS.map(({ grupo, faceta, titulo, textos }) => (
        <fieldset key={grupo} className="flex flex-col">
          <legend className="mb-1.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-suave">
            {t(`filtros.${titulo}`)}
          </legend>
          {PARAMETROS[grupo].valores.map((valor) => (
            <Casilla
              key={valor}
              etiqueta={t(`${textos}.${valor}` as never)}
              cuenta={(facetas[faceta] as Record<string, number | undefined>)[valor] ?? 0}
              checked={(filtros[grupo] as readonly string[]).includes(valor)}
              onChange={() => aplicar(alternar(filtros, grupo, valor))}
            />
          ))}
        </fieldset>
      ))}
      <Casilla
        className="border-t border-borde pt-3"
        etiqueta={t("filtros.conSalario")}
        checked={!!filtros.conSalario}
        onChange={() => aplicar(cambiar(filtros, { conSalario: !filtros.conSalario || undefined }))}
      />
    </>
  );

  if (modo === "lateral") {
    return (
      <section
        aria-labelledby="titulo-filtros"
        aria-busy={pendiente}
        className="hidden flex-col gap-6 transition-opacity aria-busy:opacity-60 lg:flex"
      >
        <div className="flex min-h-9 items-center justify-between">
          <h2 id="titulo-filtros" className="text-base font-semibold">
            {t("filtros.titulo")}
          </h2>
          {activos > 0 && (
            <button type="button" onClick={quitarTodos} className="text-sm font-semibold text-enlace hover:underline">
              {t("filtros.limpiar")}
            </button>
          )}
        </div>
        {grupos}
      </section>
    );
  }

  return (
    <>
      <Boton
        variante="secundario"
        className="lg:hidden"
        onClick={() => panel.current?.showModal()}
        aria-haspopup="dialog"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {activos ? t("filtros.tituloConActivos", { count: activos }) : t("filtros.titulo")}
      </Boton>
      <dialog
        ref={panel}
        aria-labelledby="titulo-panel-filtros"
        onClick={(e) => e.target === panel.current && panel.current.close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none flex-col rounded-t-2xl bg-superficie p-0 text-texto backdrop:bg-black/50 open:flex lg:hidden"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 id="titulo-panel-filtros" className="text-lg font-semibold">
            {t("filtros.titulo")}
          </h2>
          {activos > 0 && (
            <button type="button" onClick={quitarTodos} className="min-h-11 px-1 text-sm font-semibold text-enlace">
              {t("filtros.limpiar")}
            </button>
          )}
        </div>
        <div aria-busy={pendiente} className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
          {grupos}
        </div>
        <div className="border-t border-borde px-4 pb-6 pt-3">
          <Boton tamano="lg" className="w-full" onClick={() => panel.current?.close()} disabled={pendiente}>
            {t("filtros.ver", { count: total })}
          </Boton>
        </div>
      </dialog>
    </>
  );
}
