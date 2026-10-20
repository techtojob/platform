"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { rechazarVarias } from "@/app/[locale]/staff/acciones";
import { clasesControl } from "@/components/formulario/piezas";
import { Boton } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Lista de ofertas del panel. En pendientes, cada fila tiene su casilla y, al marcar alguna,
 * sale una barra para rechazarlas todas de golpe con el mismo motivo.
 */
export function ListaConSeleccion({
  filas,
  seleccionable,
  vacio,
}: {
  filas: Array<{ id: string; titulo: string; contenido: ReactNode }>;
  seleccionable: boolean;
  /** Qué enseñar si no hay ninguna. */
  vacio: ReactNode;
}) {
  const t = useTranslations("staff.varias");
  const router = useRouter();
  const [marcadas, marcar] = useState<string[]>([]);
  const [motivo, ponerMotivo] = useState("");
  const [aviso, ponerAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, empezar] = useTransition();
  const visibles = marcadas.filter((id) => filas.some((f) => f.id === id));
  const todas = filas.length > 0 && visibles.length === filas.length;

  function rechazar() {
    if (motivo.trim().length < 3) return ponerAviso({ ok: false, texto: t("faltaMotivo") });
    empezar(async () => {
      const r = await rechazarVarias(visibles, motivo.trim());
      if ("error" in r) return ponerAviso({ ok: false, texto: t("error") });
      marcar([]);
      ponerMotivo("");
      ponerAviso({ ok: true, texto: t("hecho", { count: r.rechazadas }) });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {seleccionable && filas.length > 0 && (
        <label className="flex min-h-10 w-fit cursor-pointer items-center gap-2 text-sm font-bold text-suave">
          <input type="checkbox" className="size-5 accent-acento" checked={todas} onChange={(e) => marcar(e.target.checked ? filas.map((f) => f.id) : [])} />
          {t("todas")}
        </label>
      )}
      {filas.length === 0 && vacio}
      <ul className="flex flex-col gap-3">
        {filas.map((f) => (
          <li key={f.id} className={cn(seleccionable && "flex items-center gap-3")}>
            {seleccionable && (
              <input
                type="checkbox"
                aria-label={t("marcar", { titulo: f.titulo })}
                className="size-5 shrink-0 accent-acento"
                checked={visibles.includes(f.id)}
                onChange={(e) => marcar((m) => (e.target.checked ? [...m, f.id] : m.filter((x) => x !== f.id)))}
              />
            )}
            <div className="min-w-0 flex-1">{f.contenido}</div>
          </li>
        ))}
      </ul>

      {aviso && (
        <p role="status" className={cn("text-sm font-bold", !aviso.ok && "text-peligro")}>
          {aviso.texto}
        </p>
      )}

      {visibles.length > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-tarjeta border border-borde-fuerte bg-ventana p-4 shadow-tarjeta sm:flex-row sm:items-center">
          <p className="shrink-0 font-bold">{t("marcadas", { count: visibles.length })}</p>
          <label htmlFor="motivo-varias" className="sr-only">
            {t("motivo")}
          </label>
          <input
            id="motivo-varias"
            value={motivo}
            onChange={(e) => ponerMotivo(e.target.value)}
            placeholder={t("motivo")}
            maxLength={300}
            className={cn(clasesControl, "min-h-11 flex-1 rounded-full px-5")}
          />
          <div className="flex gap-2">
            <Boton type="button" variante="peligro" disabled={ocupado} onClick={rechazar}>
              {ocupado ? t("rechazando") : t("rechazar", { count: visibles.length })}
            </Boton>
            <Boton type="button" variante="fantasma" onClick={() => marcar([])}>
              {t("cancelar")}
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}
