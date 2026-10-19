"use client";

import { IDIOMAS, LIMITES, NIVELES_IDIOMA } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import type { ValoresOferta } from "@/lib/formulario-oferta";
import { nombreIdioma } from "@/lib/idiomas-usuario";
import { cn } from "@/lib/cn";
import { TextoError } from "./piezas";

const FRECUENTES = ["es", "en", "pt", "fr", "de", "it"] as const;

/**
 * Idiomas que pide la oferta: los 6 más comunes como botones, el resto en un desplegable,
 * y al lado de cada uno elegido, su nivel.
 */
export function SelectorIdiomas({
  pide,
  onCambio,
  error,
}: {
  pide: ValoresOferta["pide"];
  onCambio: (pide: ValoresOferta["pide"]) => void;
  error?: string;
}) {
  const t = useTranslations("staff.form");
  const locale = useLocale();
  const nombre = (i: string) => nombreIdioma(i, locale);
  const marcado = (i: string) => pide.some((p) => p.idioma === i);
  const alternar = (i: string) =>
    onCambio(marcado(i) ? pide.filter((p) => p.idioma !== i) : pide.length < LIMITES.idiomas.max ? [...pide, { idioma: i, nivel: "" }] : pide);
  const otros = IDIOMAS.filter((i) => !(FRECUENTES as readonly string[]).includes(i) && !marcado(i)).sort((a, b) =>
    nombre(a).localeCompare(nombre(b), locale),
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t("idiomasQuePide")} className="flex flex-wrap gap-2">
        {FRECUENTES.map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={marcado(i)}
            onClick={() => alternar(i)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors",
              marcado(i) ? "border-acento bg-acento text-ink" : "border-borde-fuerte hover:border-enlace",
              error && !pide.length && "border-peligro",
            )}
          >
            {nombre(i)}
          </button>
        ))}
        <select
          aria-label={t("otroIdioma")}
          value=""
          onChange={(e) => e.target.value && alternar(e.target.value)}
          className="min-h-11 rounded-full border border-dashed border-borde-fuerte bg-tarjeta px-4 text-sm font-bold text-suave"
        >
          <option value="">{t("otroIdioma")}</option>
          {otros.map((i) => (
            <option key={i} value={i}>
              {nombre(i)}
            </option>
          ))}
        </select>
      </div>
      <TextoError>{error}</TextoError>

      {pide.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pide.map((p) => (
            <li key={p.idioma} className="flex flex-wrap items-center gap-3 rounded-2xl border border-borde px-4 py-2">
              <span className="min-w-28 flex-1 font-bold">{nombre(p.idioma)}</span>
              <label className="flex items-center gap-2 text-sm text-suave">
                {t("nivel")}
                <select
                  value={p.nivel}
                  onChange={(e) => onCambio(pide.map((x) => (x.idioma === p.idioma ? { ...x, nivel: e.target.value } : x)))}
                  className="min-h-10 rounded-full border border-borde-fuerte bg-tarjeta px-3 text-sm font-bold text-texto"
                >
                  <option value="">{t("sinNivel")}</option>
                  {NIVELES_IDIOMA.map((n) => (
                    <option key={n} value={n}>
                      {n === "nativo" ? t("nativo") : n.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => alternar(p.idioma)}
                className="min-h-10 rounded-full px-3 text-sm font-bold text-enlace hover:bg-hover"
              >
                {t("quitarCorto")}
                <span className="sr-only"> {nombre(p.idioma)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
