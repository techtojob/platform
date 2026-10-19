import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Etiqueta fija, en píldora como en la landing: tecnología (neutro), nivel (postit),
 * idiomas que pide (borde), novedad o categoría (acento).
 */
export function Etiqueta({
  tono = "neutro",
  className,
  ...props
}: ComponentProps<"span"> & { tono?: "neutro" | "postit" | "borde" | "acento" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold leading-none",
        tono === "neutro" && "bg-chip text-texto",
        tono === "postit" && "bg-postit text-ink",
        tono === "borde" && "border border-borde-fuerte text-texto",
        tono === "acento" && "bg-acento text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Chip de filtro que se activa y desactiva (Remoto, Junior…). */
export function ChipFiltro({
  activo,
  className,
  ...props
}: ComponentProps<"button"> & { activo: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold transition-colors",
        activo ? "bg-acento text-ink" : "border border-borde-fuerte text-texto hover:border-enlace hover:text-enlace",
        className,
      )}
      {...props}
    />
  );
}

/** Filtro activo con botón para quitarlo. `etiquetaQuitar` es el texto para lectores de pantalla. */
export function ChipQuitable({
  children,
  etiquetaQuitar,
  onQuitar,
}: {
  children: ReactNode;
  etiquetaQuitar: string;
  onQuitar: () => void;
}) {
  return (
    <span className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-acento pl-4 pr-1 text-sm font-bold text-ink">
      {children}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={etiquetaQuitar}
        className="grid size-8 place-items-center rounded-full hover:bg-ink/15"
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </span>
  );
}
