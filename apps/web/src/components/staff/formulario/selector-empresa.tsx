"use client";

import { nombreEmpresaComparable, type EmpresaStaff } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AvatarBlob, Campo } from "@/components/ui";
import type { ValoresOferta } from "@/lib/formulario-oferta";
import { Buscador } from "./buscador";
import { TextoError } from "./piezas";

type Empresa = NonNullable<ValoresOferta["empresa"]>;

/**
 * La empresa de la oferta: se busca escribiendo. Si no está, la última opción la crea.
 * Si el nombre escrito es casi el de una que ya hay ("Teide Software S.L."), sale esa primero.
 */
export function SelectorEmpresa({
  empresas,
  valor,
  onCambio,
  error,
}: {
  empresas: EmpresaStaff[];
  valor: ValoresOferta["empresa"];
  onCambio: (empresa: Empresa | null) => void;
  error?: string;
}) {
  const t = useTranslations("staff.form");
  const [texto, ponerTexto] = useState("");

  if (valor) {
    const nueva = !valor.id;
    const datos = empresas.find((e) => e.id === valor.id);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold">{t("empresa")}</p>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-acento/60 p-3">
          <AvatarBlob nombre={valor.nombre} tamano={40} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-bold">{valor.nombre}</span>
            <span className="text-sm text-suave">
              {nueva ? t("empresaSeCrea") : t("empresaOfertas", { count: datos?.ofertas ?? 0 })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              ponerTexto("");
              onCambio(null);
            }}
            className="min-h-11 rounded-full px-4 text-sm font-bold text-enlace hover:bg-hover"
          >
            {t("cambiar")}
          </button>
        </div>
        {nueva && (
          <Campo
            type="url"
            etiqueta={t("empresaWeb")}
            placeholder="https://"
            value={valor.web}
            onChange={(e) => onCambio({ ...valor, web: e.target.value })}
          />
        )}
      </div>
    );
  }

  const buscado = nombreEmpresaComparable(texto);
  const coinciden = buscado
    ? empresas
        .map((e) => ({ e, c: nombreEmpresaComparable(e.nombre) }))
        .filter(({ c }) => c.includes(buscado) || buscado.includes(c))
        // Primero las que empiezan igual
        .sort((a, b) => Number(b.c.startsWith(buscado)) - Number(a.c.startsWith(buscado)))
        .slice(0, 8)
        .map(({ e }) => e)
    : empresas.slice().sort((a, b) => b.ofertas - a.ofertas).slice(0, 6);
  const exacta = coinciden.some((e) => nombreEmpresaComparable(e.nombre) === buscado);

  const opciones = coinciden.map((e) => ({
    clave: e.id,
    contenido: (
      <>
        <AvatarBlob nombre={e.nombre} tamano={28} />
        <span className="flex-1 font-bold">{e.nombre}</span>
        <span className="text-xs text-suave">{t("empresaOfertas", { count: e.ofertas })}</span>
      </>
    ),
    elegir: () => onCambio({ id: e.id, nombre: e.nombre, web: e.web ?? "" }),
  }));
  if (texto.trim().length >= 2 && !exacta) {
    opciones.push({
      clave: "__nueva",
      contenido: <span className="font-bold text-enlace">{t("crearEmpresa", { nombre: texto.trim() })}</span>,
      elegir: () => onCambio({ id: null, nombre: texto.trim(), web: "" }),
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Buscador
        etiqueta={t("empresa")}
        placeholder={t("empresaBuscar")}
        texto={texto}
        onTexto={ponerTexto}
        opciones={opciones}
        vacio={t("empresaEscribe")}
      />
      <TextoError>{error}</TextoError>
    </div>
  );
}
