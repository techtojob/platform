"use client";

import { TECNOLOGIAS } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { ChipQuitable } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { aParametros, alternar, cambiar, PARAMETROS, type Filtros, type GrupoFiltro } from "@/lib/filtros";

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const TEXTOS: Record<Exclude<GrupoFiltro, "tecnologias">, "areas" | "seniority" | "modalidades"> = {
  areas: "areas",
  seniority: "seniority",
  modalidades: "modalidades",
};

/** Los filtros puestos, cada uno con su ✕ para quitarlo: "“data” ✕  React ✕  Junior ✕". */
export function FiltrosActivos({ filtros }: { filtros: Filtros }) {
  const t = useTranslations();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const aplicar = (nuevos: Filtros) =>
    startTransition(() => router.replace({ pathname: "/", query: aParametros(nuevos) }, { scroll: false }));

  const chips: Array<{ clave: string; texto: string; quitar: () => void }> = [];
  if (filtros.q)
    chips.push({ clave: "q", texto: `“${filtros.q}”`, quitar: () => aplicar(cambiar(filtros, { q: undefined })) });
  for (const id of filtros.tecnologias) {
    chips.push({
      clave: `tec-${id}`,
      texto: nombresTecnologias.get(id) ?? id,
      quitar: () => aplicar(alternar(filtros, "tecnologias", id)),
    });
  }
  for (const grupo of Object.keys(TEXTOS) as Array<keyof typeof TEXTOS>) {
    for (const valor of filtros[grupo] as string[]) {
      if (!(PARAMETROS[grupo].valores as readonly string[]).includes(valor)) continue;
      chips.push({
        clave: `${grupo}-${valor}`,
        texto: t(`${TEXTOS[grupo]}.${valor}` as never),
        quitar: () => aplicar(alternar(filtros, grupo, valor)),
      });
    }
  }
  if (filtros.conSalario) {
    chips.push({
      clave: "salario",
      texto: t("filtros.conSalarioCorto"),
      quitar: () => aplicar(cambiar(filtros, { conSalario: undefined })),
    });
  }
  if (!chips.length) return null;

  return (
    <ul
      aria-label={t("filtros.activos")}
      aria-busy={pendiente}
      className="flex gap-2 overflow-x-auto pb-1 transition-opacity aria-busy:opacity-60 sm:flex-wrap sm:overflow-visible"
    >
      {chips.map((c) => (
        <li key={c.clave} className="shrink-0">
          <ChipQuitable etiquetaQuitar={t("filtros.quitar", { filtro: c.texto })} onQuitar={c.quitar}>
            {c.texto}
          </ChipQuitable>
        </li>
      ))}
    </ul>
  );
}
