"use client";

import { ORDENES_PROYECTOS, type FiltrosProyectos } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { aParametrosProyectos, cambiarProyectos } from "@/lib/filtros-proyectos";
import { cn } from "@/lib/cn";

/**
 * Cómo se ordenan: Este mes (con el desplegable para ver meses pasados), Tendencia (7 días),
 * De siempre y Nuevos.
 */
export function ElegirOrden({ filtros, mesActual, meses }: { filtros: FiltrosProyectos; mesActual: string; meses: string[] }) {
  const t = useTranslations("proyectos.ordenes");
  const format = useFormatter();
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const nombreMes = (mes: string) => format.dateTime(new Date(`${mes}-15T12:00:00Z`), { month: "long", year: "numeric" });

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pendiente}>
      <nav aria-label={t("titulo")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ORDENES_PROYECTOS.map((orden) => {
          const activo = filtros.orden === orden;
          return (
            <Link
              key={orden}
              href={{ pathname: "/proyectos", query: aParametrosProyectos(cambiarProyectos(filtros, { orden, mes: undefined })) }}
              scroll={false}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold transition-colors",
                activo ? "bg-acento text-ink" : "bg-chip text-texto hover:bg-hover",
              )}
            >
              {t(orden)}
            </Link>
          );
        })}
      </nav>
      {filtros.orden === "mes" && meses.length > 1 && (
        <>
          <label htmlFor="mes-ranking" className="sr-only">
            {t("elegirMes")}
          </label>
          <select
            id="mes-ranking"
            value={filtros.mes ?? mesActual}
            onChange={(e) =>
              empezar(() =>
                router.replace(
                  { pathname: "/proyectos", query: aParametrosProyectos(cambiarProyectos(filtros, { mes: e.target.value === mesActual ? undefined : e.target.value })) },
                  { scroll: false },
                ),
              )
            }
            className="min-h-11 rounded-full border border-borde-fuerte bg-tarjeta px-4 text-sm font-bold"
          >
            {meses.map((mes) => (
              <option key={mes} value={mes}>
                {mes === mesActual ? t("esteMes") : nombreMes(mes)}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
