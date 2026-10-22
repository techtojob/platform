"use client";

import { COMPROBACIONES, type OfertaStaff } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import type { EstadoAccion } from "@/app/[locale]/staff/acciones";
import { Aviso, Boton, Casilla } from "@/components/ui";

type Props = {
  oferta: Pick<OfertaStaff, "estado" | "urlOriginal" | "editadaEn">;
  /** "hace 2 horas": cuándo la cambió su recruiter (si está en "Editadas"). */
  editadaHace?: string | null;
  accion: (previo: EstadoAccion, formulario: FormData) => Promise<EstadoAccion>;
};

/**
 * Lo que el staff puede hacer con una oferta, según su estado:
 * - pendiente, rechazada o cerrada: marcar las comprobaciones y publicar;
 * - pendiente: rechazar con un motivo;
 * - publicada: alargar 45 días o cerrar.
 */
export function AccionesOferta({ oferta, accion, editadaHace = null }: Props) {
  const t = useTranslations("staff");
  const [estado, enviar, enviando] = useActionState(accion, {});
  const [marcadas, marcar] = useState<string[]>([]);
  const [rechazando, setRechazando] = useState(false);
  const todas = COMPROBACIONES.every((c) => marcadas.includes(c));

  const mensaje = estado.error ? (
    <p role="alert" className="rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white">
      {t.has(`errores.accion.${estado.error}` as never) ? t(`errores.accion.${estado.error}` as "errores.accion.desconocido") : t("errorGeneral")}
    </p>
  ) : estado.hecho ? (
    <p role="status" className="rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white">
      {t(`hecho.${estado.hecho}`)}
    </p>
  ) : null;

  if (oferta.estado === "publicada") {
    return (
      <div className="flex flex-col gap-4 rounded-tarjeta bg-acento p-6 text-ink shadow-tarjeta">
        <p className="text-xl font-bold">{t("acciones.publicadaTitulo")}</p>
        {/* La cambió su recruiter estando publicada: el staff la mira y la marca como revisada. */}
        {oferta.editadaEn && (
          <form action={enviar} className="flex flex-col gap-2 rounded-2xl bg-postit p-4" aria-busy={enviando}>
            <p className="text-sm font-bold">{t("detalle.editada", { tiempo: editadaHace ?? "" })}</p>
            <Boton type="submit" name="accion" value="revisada" variante="sobrePostit" className="w-full" disabled={enviando}>
              {t("detalle.marcarRevisada")}
            </Boton>
          </form>
        )}
        <form action={enviar} className="flex flex-col gap-3" aria-busy={enviando}>
          <Boton type="submit" name="accion" value="alargar" variante="sobrePostit" className="w-full" disabled={enviando}>
            {t("acciones.alargar")}
          </Boton>
          <p className="text-sm text-ink/80">{t("acciones.alargarAyuda")}</p>
          <Boton type="submit" name="accion" value="cerrar" variante="sobreAcento" className="w-full" disabled={enviando}>
            {t("acciones.cerrar")}
          </Boton>
          <p className="text-sm text-ink/80">{t("acciones.cerrarAyuda")}</p>
        </form>
        {mensaje}
      </div>
    );
  }

  return (
    <Aviso giro="-rotate-[0.6deg]" className="flex flex-col gap-4 p-6">
      <p className="text-xl font-bold">{oferta.estado === "pendiente" ? t("acciones.revisar") : t("acciones.volverAPublicar")}</p>
      <form action={enviar} className="flex flex-col gap-4" aria-busy={enviando}>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-ink/70">{t("acciones.antesDePublicar")}</legend>
          {COMPROBACIONES.map((c) => (
            <Casilla
              key={c}
              name="comprobaciones"
              value={c}
              etiqueta={t(`comprobaciones.${c}`)}
              checked={marcadas.includes(c)}
              onChange={(e) => marcar((m) => (e.target.checked ? [...m, c] : m.filter((x) => x !== c)))}
              className="items-start py-1 [&>input]:mt-0.5 [&>input]:accent-ink"
            />
          ))}
        </fieldset>
        <a href={oferta.urlOriginal} target="_blank" rel="noopener noreferrer" className="enlace-subrayado self-start text-sm font-bold">
          {t("acciones.abrirOriginal")}
        </a>
        <Boton type="submit" name="accion" value="publicar" variante="sobrePostit" tamano="lg" className="w-full" disabled={!todas || enviando}>
          {t("acciones.publicar")}
        </Boton>
        {!todas && <p className="text-sm text-ink/75">{t("acciones.marcaTodas")}</p>}
      </form>

      {oferta.estado === "pendiente" && (
        <div className="border-t border-ink/15 pt-4">
          {rechazando ? (
            <form action={enviar} className="flex flex-col gap-3" aria-busy={enviando}>
              <input type="hidden" name="accion" value="rechazar" />
              <label htmlFor="motivo" className="text-sm font-bold">
                {t("acciones.motivo")}
              </label>
              <textarea
                id="motivo"
                name="motivo"
                rows={3}
                required
                minLength={3}
                maxLength={300}
                className="w-full rounded-2xl border border-ink/30 bg-white/70 px-4 py-3 text-ink"
              />
              <div className="flex flex-wrap gap-2">
                <Boton type="submit" variante="sobrePostit" disabled={enviando}>
                  {t("acciones.rechazar")}
                </Boton>
                <Boton type="button" variante="fantasma" className="text-ink hover:bg-ink/10" onClick={() => setRechazando(false)}>
                  {t("acciones.cancelar")}
                </Boton>
              </div>
            </form>
          ) : (
            <Boton type="button" variante="fantasma" className="px-0 text-ink underline hover:bg-transparent" onClick={() => setRechazando(true)}>
              {t("acciones.noPublicar")}
            </Boton>
          )}
        </div>
      )}
      {mensaje}
    </Aviso>
  );
}
