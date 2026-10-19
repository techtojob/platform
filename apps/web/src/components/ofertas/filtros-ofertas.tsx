"use client";

import type { ResultadoOfertas } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useOptimistic, useRef, useTransition } from "react";
import { Boton, Casilla, Ventana } from "@/components/ui";
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
          <legend className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-suave">
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
        className="border-t border-borde pt-2"
        etiqueta={t("filtros.conSalario")}
        checked={!!filtros.conSalario}
        onChange={() => aplicar(cambiar(filtros, { conSalario: !filtros.conSalario || undefined }))}
      />
    </>
  );

  if (modo === "lateral") {
    return (
      // Como un canal de Discord, igual que las preguntas frecuentes de la landing.
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
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none flex-col rounded-t-3xl bg-ventana p-0 text-texto backdrop:bg-black/60 open:flex lg:hidden"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 id="titulo-panel-filtros" className="text-lg font-bold">
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
            {t("filtros.ver", { count: total })}
          </Boton>
        </div>
      </dialog>
    </>
  );
}
