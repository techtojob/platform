"use client";

import { PAISES, REGIONES, subdivisionesDe } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition, type FormEvent } from "react";
import { guardarUbicacion } from "@/app/[locale]/cuenta/acciones-ubicacion";
import { clasesControl, TextoError } from "@/components/formulario/piezas";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const CERCA = new Set<string>(["ES", ...REGIONES.latam]);

/**
 * País y región (comunidad autónoma, estado, provincia…). Se usa al completar la cuenta
 * (obligatorio, y después lleva a las ofertas) y en Mi cuenta (para cambiarlo).
 */
export function FormularioUbicacion({
  inicial,
  alGuardar,
}: {
  inicial: { pais: string; region: string | null } | null;
  /** "ofertas": al guardar, a las ofertas (al completar la cuenta). "aviso": se queda y dice "Guardado". */
  alGuardar: "ofertas" | "aviso";
}) {
  const t = useTranslations("ubicacion");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [pais, ponerPais] = useState(inicial?.pais ?? "");
  const [region, ponerRegion] = useState(inicial?.region ?? "");
  const [error, ponerError] = useState<string | null>(null);
  const [hecho, ponerHecho] = useState(false);
  const [ocupado, empezar] = useTransition();

  // España primero, luego Latinoamérica y, aparte, el resto de países (por orden alfabético).
  const [cerca, lejos] = useMemo(() => {
    const nombres = new Intl.DisplayNames([locale], { type: "region" });
    const lista = PAISES.map((c) => ({ codigo: c, nombre: nombres.of(c) ?? c }));
    const orden = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, locale);
    const españa = lista.filter((p) => p.codigo === "ES");
    return [
      [...españa, ...lista.filter((p) => CERCA.has(p.codigo) && p.codigo !== "ES").sort(orden)],
      lista.filter((p) => !CERCA.has(p.codigo)).sort(orden),
    ];
  }, [locale]);
  const regiones = subdivisionesDe(pais);
  const etiquetaRegion = t(pais === "ES" ? "region.ES" : pais === "MX" || pais === "BR" || pais === "VE" ? "region.estado" : "region.otro");

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pais) return ponerError("pais");
    if (regiones.length && !region) return ponerError("region");
    ponerError(null);
    empezar(async () => {
      const r = await guardarUbicacion(pais, regiones.length ? region : null);
      if (r) return ponerError(r === "pais" || r === "region" ? r : "desconocido");
      if (alGuardar === "ofertas") {
        router.replace("/");
        router.refresh();
      } else {
        ponerHecho(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-pais`} className="text-sm font-bold">
          {t("pais")}
        </label>
        <select
          id={`${id}-pais`}
          value={pais}
          onChange={(e) => {
            ponerPais(e.target.value);
            ponerRegion("");
            ponerHecho(false);
          }}
          aria-invalid={error === "pais" || undefined}
          className={cn(clasesControl, "min-h-12 rounded-control px-5")}
        >
          <option value="">{t("eligePais")}</option>
          <optgroup label={t("cerca")}>
            {cerca.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("otros")}>
            {lejos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nombre}
              </option>
            ))}
          </optgroup>
        </select>
        <TextoError>{error === "pais" ? t("errores.pais") : undefined}</TextoError>
      </div>

      {regiones.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-region`} className="text-sm font-bold">
            {etiquetaRegion}
          </label>
          <select
            id={`${id}-region`}
            value={region}
            onChange={(e) => {
              ponerRegion(e.target.value);
              ponerHecho(false);
            }}
            aria-invalid={error === "region" || undefined}
            className={cn(clasesControl, "min-h-12 rounded-control px-5")}
          >
            <option value="">{t("eligeRegion")}</option>
            {regiones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <TextoError>{error === "region" ? t("errores.region") : undefined}</TextoError>
        </div>
      )}

      {error === "desconocido" && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t("errores.desconocido")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" disabled={ocupado}>
          {ocupado ? t("guardando") : alGuardar === "ofertas" ? t("continuar") : t("guardar")}
        </Boton>
        {hecho && (
          <p role="status" className="text-sm font-bold">
            {t("guardado")}
          </p>
        )}
      </div>
    </form>
  );
}
