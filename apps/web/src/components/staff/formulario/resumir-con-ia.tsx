"use client";

import { leerRespuestaIA } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AreaTexto } from "@/components/formulario/piezas";
import { Boton } from "@/components/ui";
import { CopiarTexto } from "@/components/staff/copiar-texto";
import { promptConOferta } from "@/lib/prompt-ia";
import type { ValoresOferta } from "@/lib/formulario-oferta";

/**
 * "Resumir con IA", en dos pasos: 1) copiar el prompt con la oferta (para ChatGPT o Claude);
 * 2) pegar aquí la respuesta: se reparte sola en resumen, responsabilidades, requisitos, nivel, idiomas y tecnologías.
 */
export function ResumirConIA({
  valores,
  textoOriginal,
  onCambio,
}: {
  valores: ValoresOferta;
  /** El texto de la empresa (si es automática); si no, la descripción del formulario. */
  textoOriginal: string | null;
  onCambio: (cambios: Partial<ValoresOferta>) => void;
}) {
  const t = useTranslations("staff.prompt");
  const tc = useTranslations("staff.form.campo");
  const [respuesta, ponerRespuesta] = useState("");
  const [aviso, ponerAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  function repartir() {
    const r = leerRespuestaIA(respuesta);
    const cambios: Partial<ValoresOferta> = {};
    const hechos: string[] = [];
    const poner = (campo: Parameters<typeof tc>[0], c: Partial<ValoresOferta>) => {
      Object.assign(cambios, c);
      hechos.push(tc(campo));
    };
    if (r.resumen) poner("resumen", { resumen: r.resumen });
    if (r.responsabilidades) poner("responsabilidades", { responsabilidades: r.responsabilidades.join("\n") });
    if (r.requisitos) poner("requisitos", { requisitos: r.requisitos.join("\n") });
    if (r.seniority) poner("seniority", { seniority: r.seniority });
    if (r.idiomas) poner("idiomasRequeridos", { pide: r.idiomas.map((i) => ({ idioma: i.idioma, nivel: i.nivel ?? "" })) });
    if (r.tecnologias) poner("tecnologias", { tecnologias: [...new Set([...valores.tecnologias, ...r.tecnologias])] });
    if (!hechos.length) return ponerAviso({ ok: false, texto: t("nadaQueRepartir") });
    onCambio(cambios);
    ponerRespuesta("");
    ponerAviso({ ok: true, texto: t("repartido", { campos: hechos.join(", ") }) });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-borde-fuerte p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold">{t("enFormularioTitulo")}</p>
        <p className="text-sm text-suave">{t("enFormularioAyuda")}</p>
      </div>
      <CopiarTexto
        variante="secundario"
        className="self-start"
        etiqueta={t("paso1Boton")}
        texto={promptConOferta({
          titulo: valores.titulo || "(sin título)",
          empresa: valores.empresa?.nombre || "(sin empresa)",
          texto: textoOriginal || valores.descripcion,
        })}
      />
      <AreaTexto
        etiqueta={t("paso2Etiqueta")}
        rows={5}
        value={respuesta}
        onChange={(e) => {
          ponerRespuesta(e.target.value);
          ponerAviso(null);
        }}
        placeholder={"RESUMEN: …\nRESPONSABILIDADES:\n• …"}
      />
      <Boton type="button" className="self-start" disabled={!respuesta.trim()} onClick={repartir}>
        {t("repartir")}
      </Boton>
      {aviso && (
        <p role="status" className={aviso.ok ? "text-sm font-bold" : "text-sm font-semibold text-peligro"}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
