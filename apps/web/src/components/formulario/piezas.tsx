"use client";

import { useFormatter } from "next-intl";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Piezas del formulario de ofertas del staff: secciones, textos de ayuda y error,
 * áreas de texto y botones de opción (en vez de desplegables cuando hay pocas opciones).
 */

export const clasesControl =
  "w-full rounded-2xl border border-borde-fuerte bg-tarjeta px-4 py-3 text-base text-texto placeholder:text-suave aria-invalid:border-peligro";

/** Una parte del formulario con su número y título: "1 · La oferta". */
export function Seccion({ numero, titulo, ayuda, children, id }: { numero: number; titulo: string; ayuda?: ReactNode; children: ReactNode; id?: string }) {
  const idTitulo = useId();
  return (
    <section id={id} aria-labelledby={idTitulo} className="scroll-mt-28 rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta sm:p-7">
      <h2 id={idTitulo} className="flex items-center gap-3 text-titulo-3 font-bold">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-acento text-sm text-ink">
          {numero}
        </span>
        {titulo}
      </h2>
      {ayuda && <p className="mt-2 text-sm text-suave">{ayuda}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

export function TextoError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="text-sm font-semibold text-peligro">
      {children}
    </p>
  );
}

export const describe = (id: string, ayuda?: unknown, error?: unknown) =>
  cn(ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : "") || undefined;

export function AreaTexto({
  etiqueta,
  ayuda,
  error,
  className,
  contador = false,
  ...props
}: ComponentProps<"textarea"> & {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: string;
  /** Enseña "usados/máximo" debajo, a la derecha (hace falta `maxLength`). */
  contador?: boolean;
}) {
  const id = useId();
  // Con el formato del idioma de la página (igual en el servidor y en el navegador).
  const formato = useFormatter();
  const usados = String(props.value ?? "").length;
  const maximo = props.maxLength;
  const cerca = !!maximo && usados >= maximo * 0.9;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {etiqueta}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, ayuda, error)}
        className={clasesControl}
        {...props}
      />
      {(ayuda || (contador && maximo)) && (
        <div className="flex items-start justify-between gap-4">
          {ayuda ? (
            <p id={`${id}-ayuda`} className="text-sm text-suave">
              {ayuda}
            </p>
          ) : (
            <span />
          )}
          {contador && maximo && (
            // Solo se anuncia al lector de pantalla cuando queda poco.
            <p aria-live={cerca ? "polite" : "off"} className={cn("shrink-0 text-sm tabular-nums", cerca ? "font-bold text-peligro" : "text-suave")}>
              {formato.number(usados)}/{formato.number(maximo)}
            </p>
          )}
        </div>
      )}
      <TextoError id={`${id}-error`}>{error}</TextoError>
    </div>
  );
}

/**
 * Botones de opción: todas las opciones a la vista y se elige con un clic.
 * Por dentro son radios (el teclado funciona con las flechas, como un grupo de radios normal).
 */
export function BotonesOpcion<T extends string>({
  nombre,
  etiqueta,
  opciones,
  valor,
  onCambio,
  error,
  pequenos = false,
}: {
  nombre: string;
  etiqueta: string;
  opciones: ReadonlyArray<{ valor: T; texto: string }>;
  valor: string;
  onCambio: (valor: T) => void;
  error?: string;
  pequenos?: boolean;
}) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined} className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">{etiqueta}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <label key={o.valor} className="cursor-pointer">
            <input
              type="radio"
              name={`${nombre}-${id}`}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => onCambio(o.valor)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex items-center rounded-full border font-bold transition-colors",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-enlace",
                "border-borde-fuerte text-texto hover:border-enlace peer-checked:border-acento peer-checked:bg-acento peer-checked:text-ink",
                error && "border-peligro",
                pequenos ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-sm",
              )}
            >
              {o.texto}
            </span>
          </label>
        ))}
      </div>
      <TextoError id={`${id}-error`}>{error}</TextoError>
    </fieldset>
  );
}

/** Botón pequeño en forma de chip ("+ React"). */
export function ChipAnadir({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-acento px-3 text-sm font-bold text-enlace transition-colors hover:bg-acento hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Chip elegido con su ✕ para quitarlo. */
export function ChipElegido({ children, quitar, onQuitar }: { children: ReactNode; quitar: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-acento pl-3 pr-1 text-sm font-bold text-ink">
      {children}
      <button type="button" onClick={onQuitar} aria-label={quitar} className="flex size-7 items-center justify-center rounded-full hover:bg-ink/15">
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </span>
  );
}
