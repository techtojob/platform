"use client";

import { buscarTecnologia, LIMITES, TECNOLOGIAS } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Buscador } from "./buscador";
import { ChipAnadir, ChipElegido, TextoError } from "./piezas";

const PORID = new Map<string, { nombre: string }>(TECNOLOGIAS.map((t) => [t.id, t]));
const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Tecnologías de la oferta: se buscan escribiendo (entiende alias: "js", "k8s"…),
 * se proponen las que salen en el texto de la oferta y, si no, las típicas del área.
 */
export function SelectorTecnologias({
  elegidas,
  onCambio,
  enElTexto,
  area,
  error,
  maximo = LIMITES.tecnologias.max,
  etiqueta,
  ayuda,
}: {
  elegidas: string[];
  onCambio: (ids: string[]) => void;
  /** Las que aparecen en el texto (descripción de la oferta, "sobre mí"…). */
  enElTexto: string[];
  area: string;
  error?: string;
  /** Cuántas se pueden elegir (12 en una oferta, 15 en un perfil). */
  maximo?: number;
  etiqueta?: string;
  ayuda?: string;
}) {
  const t = useTranslations("formulario");
  const [texto, ponerTexto] = useState("");
  const lleno = elegidas.length >= maximo;
  const anadir = (ids: string[]) => onCambio([...new Set([...elegidas, ...ids])].slice(0, maximo));
  const quitar = (id: string) => onCambio(elegidas.filter((x) => x !== id));

  const buscado = normalizar(texto);
  const exacta = buscado ? buscarTecnologia(texto) : undefined;
  const coinciden = buscado
    ? TECNOLOGIAS.filter(
        (tec) =>
          !elegidas.includes(tec.id) &&
          (tec.id === exacta?.id || [tec.nombre, ...tec.alias].some((n) => normalizar(n).includes(buscado))),
      )
        .sort((a, b) => Number(b.id === exacta?.id) - Number(a.id === exacta?.id))
        .slice(0, 8)
    : [];

  const detectadas = enElTexto.filter((id) => !elegidas.includes(id));
  const delArea = TECNOLOGIAS.filter(
    (tec) => (tec.areas as readonly string[]).includes(area) && !elegidas.includes(tec.id) && !detectadas.includes(tec.id),
  ).slice(0, 8);

  return (
    <div className="flex flex-col gap-3">
      <Buscador
        etiqueta={etiqueta ?? t("tecnologias")}
        ayuda={ayuda ?? t("tecnologiasAyuda", { max: maximo })}
        placeholder={lleno ? t("tecnologiasLleno", { max: maximo }) : t("tecnologiasBuscar")}
        texto={texto}
        onTexto={ponerTexto}
        vacio={buscado ? t("tecnologiaNoEsta") : undefined}
        opciones={
          lleno
            ? []
            : coinciden.map((tec) => ({
                clave: tec.id,
                contenido: <span className="font-bold">{tec.nombre}</span>,
                elegir: () => {
                  anadir([tec.id]);
                  ponerTexto("");
                },
              }))
        }
      />
      <TextoError>{error}</TextoError>

      {elegidas.length > 0 && (
        <ul aria-label={t("tecnologiasElegidas")} className="flex flex-wrap gap-2">
          {elegidas.map((id) => (
            <li key={id}>
              <ChipElegido quitar={t("quitar", { nombre: PORID.get(id)?.nombre ?? id })} onQuitar={() => quitar(id)}>
                {PORID.get(id)?.nombre ?? id}
              </ChipElegido>
            </li>
          ))}
        </ul>
      )}

      {!lleno && detectadas.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-postit/10 p-3">
          <p className="text-sm font-bold">{t("enElTexto")}</p>
          <div className="flex flex-wrap gap-2">
            {detectadas.map((id) => (
              <ChipAnadir key={id} onClick={() => anadir([id])} aria-label={t("anadir", { nombre: PORID.get(id)?.nombre ?? id })}>
                + {PORID.get(id)?.nombre ?? id}
              </ChipAnadir>
            ))}
            {detectadas.length > 1 && (
              <button type="button" onClick={() => anadir(detectadas)} className="min-h-9 rounded-full px-3 text-sm font-bold text-enlace underline hover:bg-hover">
                {t("anadirTodas")}
              </button>
            )}
          </div>
        </div>
      )}

      {!lleno && delArea.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-suave">{t("tipicasDelArea")}</p>
          <div className="flex flex-wrap gap-2">
            {delArea.map((tec) => (
              <ChipAnadir key={tec.id} onClick={() => anadir([tec.id])} className="border-borde-fuerte text-suave" aria-label={t("anadir", { nombre: tec.nombre })}>
                + {tec.nombre}
              </ChipAnadir>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
