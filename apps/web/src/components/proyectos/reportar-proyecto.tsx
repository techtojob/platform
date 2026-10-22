"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { reportarProyecto } from "@/app/[locale]/proyectos/acciones";
import { Boton } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** "Reportar proyecto": abre un cuadro para contar qué pasa. Hay que haber iniciado sesión. */
export function ReportarProyecto({ id, conSesion, tipo = "proyecto" }: { id: string; conSesion: boolean; tipo?: "proyecto" | "portfolio" }) {
  const t = useTranslations(tipo === "portfolio" ? "portfolios.reportar" : "proyectos.reportar");
  const cuadro = useRef<HTMLDialogElement>(null);
  const [motivo, ponerMotivo] = useState("");
  const [estado, ponerEstado] = useState<"listo" | "hecho" | string>("listo");
  const [enviando, empezar] = useTransition();

  function enviar() {
    empezar(async () => {
      const error = await reportarProyecto({ tipo, id }, motivo);
      ponerEstado(error ?? "hecho");
    });
  }

  return (
    <>
      <button type="button" onClick={() => cuadro.current?.showModal()} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 text-sm font-bold text-suave hover:bg-hover hover:text-texto">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
        {t("boton")}
      </button>
      <dialog
        ref={cuadro}
        aria-labelledby="titulo-reportar-proyecto"
        onClick={(e) => e.target === cuadro.current && cuadro.current.close()}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-tarjeta bg-ventana p-0 text-texto backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id="titulo-reportar-proyecto" className="text-titulo-3 font-bold">
            {t("titulo")}
          </h2>
          {!conSesion ? (
            <>
              <p className="text-suave">{t("entraAntes")}</p>
              <Link href="/entrar" className="font-bold text-enlace underline">
                {t("entrar")}
              </Link>
            </>
          ) : estado === "hecho" ? (
            <p role="status" className="font-bold">
              {t("gracias")}
            </p>
          ) : (
            <>
              <label htmlFor="motivo-reporte-proyecto" className="text-sm font-bold">
                {t("motivo")}
              </label>
              <textarea
                id="motivo-reporte-proyecto"
                rows={4}
                maxLength={500}
                value={motivo}
                onChange={(e) => ponerMotivo(e.target.value)}
                className="w-full rounded-2xl border border-borde-fuerte bg-tarjeta px-4 py-3"
              />
              {estado !== "listo" && (
                <p role="alert" className="text-sm font-semibold text-peligro">
                  {t.has(`errores.${estado}` as never) ? t(`errores.${estado}` as never) : t("errores.otro")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Boton type="button" onClick={enviar} disabled={enviando || motivo.trim().length < 5}>
                  {enviando ? t("enviando") : t("enviar")}
                </Boton>
                <Boton type="button" variante="fantasma" onClick={() => cuadro.current?.close()}>
                  {t("cancelar")}
                </Boton>
              </div>
            </>
          )}
          {(estado === "hecho" || !conSesion) && (
            <Boton type="button" variante="secundario" className="self-start" onClick={() => cuadro.current?.close()}>
              {t("cerrar")}
            </Boton>
          )}
        </div>
      </dialog>
    </>
  );
}
