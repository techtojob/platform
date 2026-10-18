import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Etiqueta fija: tecnología (neutro), nivel (postit), idiomas que pide (borde)… */
export function Etiqueta({
  tono = "neutro",
  className,
  ...props
}: ComponentProps<"span"> & { tono?: "neutro" | "postit" | "borde" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[0.8125rem] font-medium",
        tono === "neutro" && "bg-chip text-texto",
        tono === "postit" && "bg-postit font-semibold text-ink",
        tono === "borde" && "border border-borde-fuerte font-semibold text-texto",
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
        "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition",
        activo ? "bg-acento text-sobre-acento" : "border border-borde-fuerte text-texto hover:bg-hover",
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
    <span className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-chip pl-3 pr-1 text-sm font-semibold text-texto">
      {children}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={etiquetaQuitar}
        className="grid size-8 place-items-center rounded-full hover:bg-borde"
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </span>
  );
}
