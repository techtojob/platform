"use client";

import type { ResultadoOfertas } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { PanelFiltros } from "@/components/filtros/panel-filtros";
import { Casilla } from "@/components/ui";
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

  return (
    <PanelFiltros modo={modo} activos={activos} pendiente={pendiente} onQuitarTodos={quitarTodos} textoVer={t("filtros.ver", { count: total })}>
      {grupos}
    </PanelFiltros>
  );
}
