"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { reportar, type CosaReportable } from "@/app/[locale]/acciones-reportar";
import { Boton, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Tipo = CosaReportable["tipo"];

/** Motivos para elegir de un clic, según lo que se reporta. "otro" pide escribir qué pasa. */
const MOTIVOS: Record<Tipo, readonly string[]> = {
  oferta: ["no_disponible", "enlace_roto", "falsa", "discriminatoria", "spam", "otro"],
  recruiter: ["suplanta", "spam", "trato", "otro"],
  perfil: ["falso", "spam", "ofensivo", "otro"],
  proyecto: ["no_es_suyo", "spam", "ofensivo", "enlace", "otro"],
  portfolio: ["no_es_suyo", "spam", "ofensivo", "enlace", "otro"],
};

type Props = {
  /** Lo que se puede reportar. Con dos (una oferta y quien la publicó), se elige primero cuál. */
  cosas: Array<CosaReportable & { nombre?: string }>;
  /** Si se sabe que no hay sesión, se pide entrar antes de rellenar nada. */
  conSesion?: boolean;
  /**
   * Para abrirlo desde fuera (el menú "⋯" de las tarjetas): sin botón propio; se abre cuando pasa a true
   * y avisa con onCerrar al cerrarse.
   */
  abierto?: boolean;
  onCerrar?: () => void;
  className?: string;
};

/**
 * Reportar cualquier cosa (oferta, recruiter, perfil, proyecto o portfolio): un botón visible y un cuadro
 * con motivos para pulsar y un texto opcional. El staff lo ve en Panel de staff › Reportes.
 */
export function Reportar({ cosas, conSesion = true, abierto, onCerrar, className }: Props) {
  const t = useTranslations("reportar");
  const id = useId();
  const cuadro = useRef<HTMLDialogElement>(null);
  const [indice, elegirCosa] = useState(0);
  const [motivo, elegirMotivo] = useState<string | null>(null);
  const [detalle, ponerDetalle] = useState("");
  const [estado, ponerEstado] = useState<"listo" | "hecho" | string>("listo");
  const [enviando, empezar] = useTransition();
  const cosa = cosas[indice]!;
  const sinSesion = !conSesion || estado === "sin_sesion";
  const listo = !!motivo && (motivo !== "otro" || detalle.trim().length >= 5) && detalle.trim().length <= 450;

  function abrir() {
    if (estado === "hecho") {
      ponerEstado("listo");
      elegirMotivo(null);
      ponerDetalle("");
    }
    if (!cuadro.current?.open) cuadro.current?.showModal();
  }

  // Abierto desde fuera.
  useEffect(() => {
    if (abierto && !cuadro.current?.open) cuadro.current?.showModal();
  }, [abierto]);

  function enviar() {
    if (!motivo) return;
    const etiqueta = t(`motivos.${cosa.tipo}.${motivo}` as never);
    const texto = detalle.trim() ? (motivo === "otro" ? detalle.trim() : `${etiqueta}: ${detalle.trim()}`) : etiqueta;
    empezar(async () => {
      const error = await reportar({ tipo: cosa.tipo, id: cosa.id }, texto);
      ponerEstado(error ?? "hecho");
    });
  }

  return (
    <>
      {abierto === undefined && (
        <button type="button" onClick={abrir} className={clasesBoton({ variante: "secundario", className: cn("gap-2 hover:border-peligro hover:text-peligro", className) })}>
          <IconoBandera />
          {t("boton")}
        </button>
      )}
      <dialog
        ref={cuadro}
        onClose={() => {
          onCerrar?.();
          if (estado === "hecho") {
            ponerEstado("listo");
            elegirMotivo(null);
            ponerDetalle("");
          }
        }}
        aria-labelledby={`${id}-titulo`}
        onClick={(e) => e.target === cuadro.current && cuadro.current.close()}
        className="m-auto w-[min(34rem,calc(100%-2rem))] rounded-tarjeta bg-ventana p-0 text-texto backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-5 p-6">
          <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-titulo-3 font-bold">
            <IconoBandera tamano={20} />
            {t(`titulos.${cosa.tipo}`)}
          </h2>

          {sinSesion ? (
            <>
              <p className="text-suave">{t("entraAntes")}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/entrar" className={clasesBoton()}>
                  {t("entrar")}
                </Link>
                <Boton type="button" variante="fantasma" onClick={() => cuadro.current?.close()}>
                  {t("cancelar")}
                </Boton>
              </div>
            </>
          ) : estado === "hecho" ? (
            <>
              <p role="status" className="font-bold">
                {t("gracias")}
              </p>
              <Boton type="button" variante="secundario" className="self-start" onClick={() => cuadro.current?.close()}>
                {t("cerrar")}
              </Boton>
            </>
          ) : (
            <>
              {cosas.length > 1 && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-bold">{t("que")}</legend>
                  {cosas.map((c, i) => (
                    <label key={c.tipo} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-borde px-4 has-[:checked]:border-acento">
                      <input
                        type="radio"
                        name={`${id}-que`}
                        checked={indice === i}
                        onChange={() => {
                          elegirCosa(i);
                          elegirMotivo(null);
                        }}
                        className="size-4 accent-[var(--color-acento)]"
                      />
                      <span className="font-bold">{c.tipo === "recruiter" ? t("opciones.recruiter", { nombre: c.nombre ?? "" }) : t("opciones.oferta")}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-bold">{t("porQue")}</legend>
                <div className="flex flex-wrap gap-2">
                  {MOTIVOS[cosa.tipo].map((m) => (
                    <label key={m} className="cursor-pointer">
                      <input type="radio" name={`${id}-motivo`} value={m} checked={motivo === m} onChange={() => elegirMotivo(m)} className="peer sr-only" />
                      <span className="inline-flex min-h-10 items-center rounded-full border border-borde-fuerte px-4 text-sm font-bold transition-colors hover:border-enlace peer-checked:border-acento peer-checked:bg-acento peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-enlace">
                        {t(`motivos.${cosa.tipo}.${m}` as never)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-detalle`} className="text-sm font-bold">
                  {motivo === "otro" ? t("cuentanos") : t("detalle")}
                </label>
                <textarea
                  id={`${id}-detalle`}
                  rows={3}
                  maxLength={450}
                  value={detalle}
                  onChange={(e) => ponerDetalle(e.target.value)}
                  className="w-full rounded-2xl border border-borde-fuerte bg-tarjeta px-4 py-3"
                />
              </div>

              {estado !== "listo" && (
                <p role="alert" className="text-sm font-semibold text-peligro">
                  {t.has(`errores.${estado}` as never) ? t(`errores.${estado}` as never) : t("errores.otro")}
                </p>
              )}
              <p className="text-xs text-suave">{t("privado")}</p>
              <div className="flex flex-wrap gap-2">
                <Boton type="button" variante="peligro" onClick={enviar} disabled={enviando || !listo}>
                  {enviando ? t("enviando") : t("enviar")}
                </Boton>
                <Boton type="button" variante="fantasma" onClick={() => cuadro.current?.close()}>
                  {t("cancelar")}
                </Boton>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

export function IconoBandera({ tamano = 16 }: { tamano?: number }) {
  return (
    <svg aria-hidden="true" width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}
