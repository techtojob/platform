"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChipFiltro, ChipQuitable } from "@/components/ui";

/** Demostración interactiva de los filtros para el catálogo de componentes. */
export function ChipsDemo({ opciones }: { opciones: Array<{ id: string; nombre: string }> }) {
  const t = useTranslations("componentes");
  const [activos, setActivos] = useState<string[]>(["junior", "remoto"]);
  const cambiar = (id: string) =>
    setActivos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <ChipFiltro key={o.id} activo={activos.includes(o.id)} onClick={() => cambiar(o.id)}>
            {o.nombre}
          </ChipFiltro>
        ))}
      </div>
      <div className="flex min-h-10 flex-wrap gap-2">
        {opciones
          .filter((o) => activos.includes(o.id))
          .map((o) => (
            <ChipQuitable key={o.id} etiquetaQuitar={t("quitar", { filtro: o.nombre })} onQuitar={() => cambiar(o.id)}>
              {o.nombre}
            </ChipQuitable>
          ))}
      </div>
    </div>
  );
}
