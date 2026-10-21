"use client";

import {
  AREAS,
  ATS,
  FECHAS_STAFF,
  IDIOMAS_STAFF,
  NOMBRES_ATS,
  ORDENES_STAFF,
  PAISES,
  parametrosStaff,
  SENIORITY,
  type FiltrosStaff,
} from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { clasesControl } from "@/components/formulario/piezas";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Barra de filtros del panel: buscar, idioma, origen, desde dónde, área, nivel, fecha y orden.
 * Cada cambio va a la dirección (se puede compartir el enlace) y vuelve a la primera página.
 */
export function BarraFiltrosStaff({ filtros }: { filtros: FiltrosStaff }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [texto, ponerTexto] = useState(filtros.q ?? "");
  const paises = useMemo(() => {
    const nombres = new Intl.DisplayNames([locale], { type: "region" });
    return PAISES.map((c) => ({ codigo: c, nombre: nombres.of(c) ?? c })).sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
  }, [locale]);

  const ir = (cambios: Partial<FiltrosStaff>) =>
    startTransition(() => router.push({ pathname: "/staff", query: parametrosStaff({ ...filtros, ...cambios, pagina: 1 }) }));

  const origen = filtros.fuente ? `automatica:${filtros.fuente}` : (filtros.origen ?? "");

  return (
    <div className={cn("flex flex-col gap-3", pendiente && "opacity-70")} aria-busy={pendiente}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          ir({ q: texto.trim() || undefined });
        }}
        className="flex gap-2"
      >
        <label htmlFor="staff-buscar" className="sr-only">
          {t("staff.filtros.buscar")}
        </label>
        <input
          id="staff-buscar"
          type="search"
          value={texto}
          onChange={(e) => ponerTexto(e.target.value)}
          placeholder={t("staff.filtros.buscar")}
          maxLength={100}
          className={cn(clasesControl, "min-h-11 flex-1 rounded-full px-5")}
        />
        <Boton type="submit" variante="secundario" className="min-h-11">
          {t("staff.filtros.buscarBoton")}
        </Boton>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Desplegable etiqueta={t("staff.filtros.idioma")} valor={filtros.idioma ?? ""} onCambio={(v) => ir({ idioma: (v || undefined) as FiltrosStaff["idioma"] })}>
          <option value="">{t("staff.filtros.todos")}</option>
          {IDIOMAS_STAFF.map((i) => (
            <option key={i} value={i}>
              {t(`staff.filtros.idiomas.${i}`)}
            </option>
          ))}
        </Desplegable>
        <Desplegable
          etiqueta={t("staff.filtros.origen")}
          valor={origen}
          onCambio={(v) => {
            const [o, fuente] = v.split(":");
            ir({ origen: (o || undefined) as FiltrosStaff["origen"], fuente: (fuente || undefined) as FiltrosStaff["fuente"] });
          }}
        >
          <option value="">{t("staff.filtros.todos")}</option>
          <option value="manual">{t("staff.filtros.manual")}</option>
          <option value="automatica">{t("staff.filtros.automatica")}</option>
          {ATS.map((a) => (
            <option key={a} value={`automatica:${a}`}>
              {t("staff.filtros.automaticaDe", { fuente: NOMBRES_ATS[a] })}
            </option>
          ))}
        </Desplegable>
        <Desplegable etiqueta={t("staff.filtros.desde")} valor={filtros.desde ?? ""} onCambio={(v) => ir({ desde: v || undefined })}>
          <option value="">{t("staff.filtros.cualquierSitio")}</option>
          {paises.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nombre}
            </option>
          ))}
        </Desplegable>
        <Desplegable etiqueta={t("staff.filtros.fecha")} valor={filtros.fecha ?? ""} onCambio={(v) => ir({ fecha: (v || undefined) as FiltrosStaff["fecha"] })}>
          <option value="">{t("staff.filtros.siempre")}</option>
          {FECHAS_STAFF.map((f) => (
            <option key={f} value={f}>
              {t(`staff.filtros.fechas.${f}`)}
            </option>
          ))}
        </Desplegable>
        <Desplegable etiqueta={t("staff.form.area")} valor={filtros.areas[0] ?? ""} onCambio={(v) => ir({ areas: v ? [v as FiltrosStaff["areas"][number]] : [] })}>
          <option value="">{t("staff.filtros.todas")}</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {t(`areas.${a}`)}
            </option>
          ))}
        </Desplegable>
        <Desplegable
          etiqueta={t("staff.form.seniority")}
          valor={filtros.seniority[0] ?? ""}
          onCambio={(v) => ir({ seniority: v ? [v as FiltrosStaff["seniority"][number]] : [] })}
        >
          <option value="">{t("staff.filtros.todos")}</option>
          {SENIORITY.map((s) => (
            <option key={s} value={s}>
              {t(`seniority.${s}`)}
            </option>
          ))}
        </Desplegable>
        <Desplegable etiqueta={t("staff.filtros.orden")} valor={filtros.orden} onCambio={(v) => ir({ orden: v as FiltrosStaff["orden"] })}>
          {ORDENES_STAFF.filter((o) => o !== "caducan" || filtros.estado === "publicada").map((o) => (
            <option key={o} value={o}>
              {t(`staff.filtros.ordenes.${o}`)}
            </option>
          ))}
        </Desplegable>
      </div>
    </div>
  );
}

function Desplegable({ etiqueta, valor, onCambio, children }: { etiqueta: string; valor: string; onCambio: (v: string) => void; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-suave">
      {etiqueta}
      <select
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className={cn(clasesControl, "min-h-11 rounded-full px-4 text-sm font-semibold text-texto", valor && "border-acento")}
      >
        {children}
      </select>
    </label>
  );
}
