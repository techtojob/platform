"use client";

import { buscarTecnologia, TECNOLOGIAS } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Boton, Campo, ChipFiltro, ChipQuitable } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  aParametros,
  alternar,
  hayFiltros,
  PARAMETROS,
  SIN_FILTROS,
  type Filtros,
  type GrupoFiltro,
} from "@/lib/filtros";

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));

/** Para cada grupo de chips, de dónde sale el nombre de cada valor en messages/<idioma>.json. */
const GRUPOS_CHIPS = [
  { grupo: "areas", titulo: "area", textos: "areas" },
  { grupo: "seniority", titulo: "nivel", textos: "seniority" },
  { grupo: "modalidades", titulo: "modalidad", textos: "modalidades" },
] as const;

/**
 * Filtros del listado. No guardan nada por su cuenta: cambian la dirección
 * (?area=…&nivel=…) y el servidor vuelve a pedir las ofertas.
 */
export function FiltrosOfertas({ filtros }: { filtros: Filtros }) {
  const t = useTranslations();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string>();
  // En el móvil van plegados para que las ofertas se vean nada más entrar. En el ordenador, siempre a la vista.
  const [abierto, setAbierto] = useState(false);
  const activos = (Object.keys(PARAMETROS) as GrupoFiltro[]).reduce((n, g) => n + filtros[g].length, 0);

  function aplicar(nuevos: Filtros) {
    startTransition(() => router.replace({ pathname: "/", query: aParametros(nuevos) }, { scroll: false }));
  }

  function cambiar(grupo: GrupoFiltro, valor: string) {
    aplicar(alternar(filtros, grupo, valor));
  }

  function anadirTecnologia(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const tecnologia = buscarTecnologia(texto);
    if (!tecnologia) {
      setError(t("filtros.tecnologiaDesconocida", { texto: texto.trim() }));
      return;
    }
    setTexto("");
    setError(undefined);
    if (!filtros.tecnologias.includes(tecnologia.id)) cambiar("tecnologias", tecnologia.id);
  }

  return (
    <section
      aria-label={t("filtros.titulo")}
      aria-busy={pendiente}
      className="flex flex-col gap-6 transition-opacity aria-busy:opacity-60"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="hidden text-titulo-3 font-bold lg:block">{t("filtros.titulo")}</h2>
        <Boton
          variante="secundario"
          className="lg:hidden"
          aria-expanded={abierto}
          aria-controls="panel-filtros"
          onClick={() => setAbierto((a) => !a)}
        >
          {activos ? t("filtros.tituloConActivos", { count: activos }) : t("filtros.titulo")}
        </Boton>
        {hayFiltros(filtros) && (
          <Boton variante="fantasma" onClick={() => aplicar(SIN_FILTROS)}>
            {t("filtros.limpiar")}
          </Boton>
        )}
      </div>

      <div id="panel-filtros" className={cn("flex-col gap-6", abierto ? "flex" : "hidden lg:flex")}>
        {GRUPOS_CHIPS.map(({ grupo, titulo, textos }) => (
          <fieldset key={grupo} className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-bold text-white/70">{t(`filtros.${titulo}`)}</legend>
            <div className="flex flex-wrap gap-2">
              {PARAMETROS[grupo].valores.map((valor) => (
                <ChipFiltro
                  key={valor}
                  activo={(filtros[grupo] as readonly string[]).includes(valor)}
                  onClick={() => cambiar(grupo, valor)}
                >
                  {t(`${textos}.${valor}` as never)}
                </ChipFiltro>
              ))}
            </div>
          </fieldset>
        ))}

        <form onSubmit={anadirTecnologia} className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Campo
              className="flex-1"
              etiqueta={t("filtros.tecnologia")}
              placeholder={t("filtros.tecnologiaEjemplo")}
              list="lista-tecnologias"
              autoComplete="off"
              value={texto}
              error={error}
              onChange={(e) => {
                setTexto(e.target.value);
                setError(undefined);
              }}
            />
            {/* mt-7: a la altura de la caja de texto, bajo la etiqueta, salga o no el error. */}
            <Boton type="submit" variante="secundario" className="mt-7 min-h-12">
              {t("filtros.anadir")}
            </Boton>
          </div>
          <datalist id="lista-tecnologias">
            {TECNOLOGIAS.filter((tec) => !filtros.tecnologias.includes(tec.id)).map((tec) => (
              <option key={tec.id} value={tec.nombre} />
            ))}
          </datalist>
          {filtros.tecnologias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filtros.tecnologias.map((id) => {
                const nombre = nombresTecnologias.get(id) ?? id;
                return (
                  <ChipQuitable
                    key={id}
                    etiquetaQuitar={t("filtros.quitar", { filtro: nombre })}
                    onQuitar={() => cambiar("tecnologias", id)}
                  >
                    {nombre}
                  </ChipQuitable>
                );
              })}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
