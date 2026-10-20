"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, type ReactNode } from "react";
import { Boton, Ventana } from "@/components/ui";

type Props = {
  /** "lateral": la columna del ordenador. "movil": el botón y el panel que sube desde abajo. */
  modo: "lateral" | "movil";
  /** Cuántos filtros hay puestos (para "Filtros (2)" y "Quitar todos"). */
  activos: number;
  /** Mientras llegan los resultados nuevos. */
  pendiente: boolean;
  onQuitarTodos: () => void;
  /** Texto del botón que cierra el panel del móvil: "Ver 12 ofertas". */
  textoVer: string;
  /** Las casillas y desplegables de cada filtro. */
  children: ReactNode;
};

/**
 * El marco de los filtros, igual en ofertas y en talento: en el ordenador, una ventana
 * tipo Discord (#filtros) en la columna izquierda; en el móvil, un botón "Filtros (2)" que
 * abre un panel desde abajo. Lo que va dentro lo pone cada listado.
 */
export function PanelFiltros({ modo, activos, pendiente, onQuitarTodos, textoVer, children }: Props) {
  const t = useTranslations("filtros");
  const panel = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  if (modo === "lateral") {
    return (
      <Ventana
        canal={t("canal")}
        aria-label={t("titulo")}
        aria-busy={pendiente}
        className="transition-opacity aria-busy:opacity-60"
        extra={
          activos > 0 && (
            <button type="button" onClick={onQuitarTodos} className="rounded-full bg-chip px-3 py-1 text-xs font-bold text-texto hover:bg-acento hover:text-ink">
              {t("limpiar")}
            </button>
          )
        }
      >
        <div className="flex flex-col gap-5 rounded-xl bg-tarjeta/50 p-3">{children}</div>
      </Ventana>
    );
  }

  return (
    <>
      <Boton variante="secundario" className="lg:hidden" onClick={() => panel.current?.showModal()} aria-haspopup="dialog">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {activos ? t("tituloConActivos", { count: activos }) : t("titulo")}
      </Boton>
      <dialog
        ref={panel}
        aria-labelledby={idTitulo}
        onClick={(e) => e.target === panel.current && panel.current.close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none flex-col rounded-t-3xl bg-ventana p-0 text-texto backdrop:bg-black/60 open:flex lg:hidden"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 id={idTitulo} className="text-lg font-bold">
            {t("titulo")}
          </h2>
          {activos > 0 && (
            <button type="button" onClick={onQuitarTodos} className="min-h-11 px-1 text-sm font-bold text-enlace">
              {t("limpiar")}
            </button>
          )}
        </div>
        <div aria-busy={pendiente} className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
          {children}
        </div>
        <div className="border-t border-borde px-4 pb-6 pt-3">
          <Boton tamano="lg" className="w-full" onClick={() => panel.current?.close()} disabled={pendiente}>
            {textoVer}
          </Boton>
        </div>
      </dialog>
    </>
  );
}
