"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { clasesControl, describe, TextoError } from "./piezas";

export type OpcionBuscador = { clave: string; contenido: ReactNode; elegir: () => void };

/**
 * Campo de texto con una lista de sugerencias debajo (combobox): escribes, salen
 * las que coinciden, con las flechas te mueves y con Intro eliges.
 * Quien lo usa decide qué opciones salen para cada texto.
 */
export function Buscador({
  etiqueta,
  ayuda,
  error,
  placeholder,
  opciones,
  texto,
  onTexto,
  vacio,
}: {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: string;
  placeholder?: string;
  /** Opciones para el texto escrito. */
  opciones: OpcionBuscador[];
  texto: string;
  onTexto: (texto: string) => void;
  /** Qué decir si no hay ninguna. */
  vacio?: ReactNode;
}) {
  const id = useId();
  const [abierto, abrir] = useState(false);
  const [activa, activar] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const visible = abierto && (opciones.length > 0 || !!vacio);
  const actual = Math.min(activa, opciones.length - 1);

  function elegir(o: OpcionBuscador) {
    o.elegir();
    activar(0);
    campo.current?.focus();
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      abrir(true);
      activar((a) => Math.min(a + 1, opciones.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activar((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (visible && opciones[actual]) {
        e.preventDefault();
        elegir(opciones[actual]);
      }
    } else if (e.key === "Escape") {
      abrir(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {etiqueta}
      </label>
      <input
        ref={campo}
        id={id}
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={visible && opciones[actual] ? `${id}-${actual}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, ayuda, error)}
        autoComplete="off"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          onTexto(e.target.value);
          abrir(true);
          activar(0);
        }}
        onFocus={() => abrir(true)}
        onBlur={() => abrir(false)}
        onKeyDown={tecla}
        className={cn(clasesControl, "min-h-12 rounded-control px-5")}
      />
      {visible && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label={etiqueta}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-borde-fuerte bg-ventana p-1.5 shadow-tarjeta"
        >
          {opciones.length === 0 && <li className="px-3 py-2.5 text-sm text-suave">{vacio}</li>}
          {opciones.map((o, i) => (
            <li
              key={o.clave}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === actual}
              // mousedown: antes de que el campo pierda el foco y se cierre la lista
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(o);
              }}
              onMouseEnter={() => activar(i)}
              className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm", i === actual && "bg-hover")}
            >
              {o.contenido}
            </li>
          ))}
        </ul>
      )}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-suave">
          {ayuda}
        </p>
      )}
      <TextoError id={`${id}-error`}>{error}</TextoError>
    </div>
  );
}
