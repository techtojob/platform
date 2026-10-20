"use client";

import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { PanelFiltros } from "@/components/filtros/panel-filtros";
import { Casilla } from "@/components/ui";
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
 * Filtros del buscador de talento. Como los de ofertas (mismo PanelFiltros): cambian la dirección
 * (?disp=buscando&area=…) y el servidor vuelve a pedir los perfiles.
 */
export function FiltrosTalento({ filtros: filtrosDireccion, paises, total, modo }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [filtros, ponerFiltros] = useOptimistic(filtrosDireccion);
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

  return (
    <PanelFiltros modo={modo} activos={activos} pendiente={pendiente} onQuitarTodos={quitarTodos} textoVer={t("talento.verPerfiles", { count: total })}>
      {grupos}
    </PanelFiltros>
  );
}
