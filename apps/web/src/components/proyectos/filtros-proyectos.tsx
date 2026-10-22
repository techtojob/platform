"use client";

import { AREAS, type FiltrosProyectos as Filtros } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { PanelFiltros } from "@/components/filtros/panel-filtros";
import { Casilla } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { aParametrosProyectos, alternarArea, cambiarProyectos } from "@/lib/filtros-proyectos";

/** Filtros de proyectos (por área). Cambian la dirección y el servidor vuelve a pedir la lista. */
export function FiltrosProyectos({ filtros: filtrosDireccion, total, modo }: { filtros: Filtros; total: number; modo: "lateral" | "movil" }) {
  const t = useTranslations();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [filtros, ponerFiltros] = useOptimistic(filtrosDireccion);
  const activos = filtros.areas.length + filtros.tecnologias.length;

  function aplicar(nuevos: Filtros) {
    startTransition(() => {
      ponerFiltros(nuevos);
      router.replace({ pathname: "/proyectos", query: aParametrosProyectos(nuevos) }, { scroll: false });
    });
  }

  return (
    <PanelFiltros
      modo={modo}
      activos={activos}
      pendiente={pendiente}
      onQuitarTodos={() => aplicar(cambiarProyectos(filtros, { areas: [], tecnologias: [] }))}
      textoVer={t("proyectos.verProyectos", { count: total })}
    >
      <fieldset className="flex flex-col">
        <legend className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-suave">{t("filtros.area")}</legend>
        {AREAS.map((area) => (
          <Casilla key={area} etiqueta={t(`areas.${area}`)} checked={filtros.areas.includes(area)} onChange={() => aplicar(alternarArea(filtros, area))} />
        ))}
      </fieldset>
      <p className="text-xs leading-relaxed text-suave">{t("proyectos.pistaTecnologia")}</p>
    </PanelFiltros>
  );
}
