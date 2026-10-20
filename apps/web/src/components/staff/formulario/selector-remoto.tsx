"use client";

import { describirRemoto, ordenarPaises, PAISES, REGIONES, type Region, type Remoto } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo } from "react";
import { useDondeRemoto } from "@/components/ofertas/datos-oferta";
import { ChipElegido, clasesControl, TextoError } from "@/components/formulario/piezas";
import { cn } from "@/lib/cn";

/** Botones rápidos: lo que más sale en las ofertas. */
const RAPIDOS: Array<{ tipo: "mundo" } | { tipo: "pais"; pais: string } | { tipo: "region"; region: Region }> = [
  { tipo: "mundo" },
  { tipo: "pais", pais: "ES" },
  { tipo: "region", region: "eu" },
  { tipo: "region", region: "latam" },
  { tipo: "pais", pais: "US" },
  { tipo: "pais", pais: "CA" },
  { tipo: "pais", pais: "GB" },
];

/**
 * Desde dónde se puede trabajar en remoto: cualquier país, o una lista de países.
 * Botones para lo más común (España, Europa, Latinoamérica…), un desplegable para el resto,
 * los elegidos como chips y, debajo, la frase tal cual saldrá en la bolsa.
 */
export function SelectorRemoto({
  valor,
  onCambio,
  error,
}: {
  valor: Remoto;
  onCambio: (r: Remoto) => void;
  error?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const id = useId();
  const donde = useDondeRemoto();
  const nombrePais = useMemo(() => {
    const nombres = new Intl.DisplayNames([locale], { type: "region" });
    return (c: string) => nombres.of(c) ?? c;
  }, [locale]);

  const tiene = (p: string) => valor.paises.includes(p);
  const regionEntera = (r: Region) => (REGIONES[r] as readonly string[]).every(tiene);
  const poner = (paises: string[]) => onCambio({ mundo: false, paises: ordenarPaises(paises) });
  const quitar = (quitados: readonly string[]) => poner(valor.paises.filter((p) => !quitados.includes(p)));

  const pulsado = (b: (typeof RAPIDOS)[number]) =>
    b.tipo === "mundo" ? valor.mundo : b.tipo === "pais" ? !valor.mundo && tiene(b.pais) : !valor.mundo && regionEntera(b.region);

  function pulsar(b: (typeof RAPIDOS)[number]) {
    if (b.tipo === "mundo") return onCambio({ mundo: !valor.mundo, paises: [] });
    const base = valor.mundo ? [] : valor.paises;
    if (b.tipo === "pais") return poner(base.includes(b.pais) ? base.filter((p) => p !== b.pais) : [...base, b.pais]);
    const suyos = REGIONES[b.region] as readonly string[];
    return pulsado(b) ? quitar(suyos) : poner([...base, ...suyos]);
  }

  const texto = (b: (typeof RAPIDOS)[number]) =>
    b.tipo === "mundo" ? t("staff.form.cualquierPais") : b.tipo === "pais" ? nombrePais(b.pais) : t(`regiones.${b.region}`);

  const otros = PAISES.filter((p) => !tiene(p))
    .map((p) => ({ codigo: p, nombre: nombrePais(p) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale));

  const descrito = describirRemoto(valor);
  const partes = descrito.mundo ? [] : descrito.partes;
  const frase = donde(valor);

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-2 text-sm font-bold">{t("staff.form.remotoDesde")}</legend>
      <div className="flex flex-wrap gap-2">
        {RAPIDOS.map((b) => (
          <button
            key={b.tipo === "mundo" ? "mundo" : b.tipo === "pais" ? b.pais : b.region}
            type="button"
            aria-pressed={pulsado(b)}
            onClick={() => pulsar(b)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors",
              pulsado(b) ? "border-acento bg-acento text-ink" : "border-borde-fuerte hover:border-enlace",
              error && !valor.mundo && !valor.paises.length && "border-peligro",
            )}
          >
            {texto(b)}
          </button>
        ))}
        {!valor.mundo && (
          <select
            aria-label={t("staff.form.otroPais")}
            value=""
            onChange={(e) => e.target.value && poner([...valor.paises, e.target.value])}
            className={cn(clasesControl, "min-h-11 w-auto rounded-full px-4 text-sm")}
          >
            <option value="">{t("staff.form.otroPais")}</option>
            {otros.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {partes.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={t("staff.form.paisesElegidos")} role="group">
          {partes.map((p) => {
            const nombre = p.tipo === "region" ? t(`regiones.${p.region}`) : nombrePais(p.pais);
            return (
              <ChipElegido
                key={p.tipo === "region" ? p.region : p.pais}
                quitar={t("staff.form.quitarSitio", { nombre })}
                onQuitar={() => quitar(p.tipo === "region" ? REGIONES[p.region] : [p.pais])}
              >
                {nombre}
              </ChipElegido>
            );
          })}
        </div>
      )}

      {frase && (
        <p className="text-sm text-suave">
          {t("staff.form.seVeraAsi")} <strong className="text-texto">{t("ofertas.remotoDonde", { donde: frase })}</strong>
        </p>
      )}
      <TextoError id={`${id}-error`}>{error}</TextoError>
    </fieldset>
  );
}
