import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Etiqueta fija: nivel, modalidad, tecnología de una oferta… */
export function Etiqueta({
  tono = "neutro",
  className,
  ...props
}: ComponentProps<"span"> & { tono?: "neutro" | "postit" | "primario" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        tono === "neutro" && "bg-white/10 text-white",
        tono === "postit" && "bg-postit text-ink",
        tono === "primario" && "border border-primary/50 text-primary",
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
        "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition",
        activo
          ? "bg-primary text-ink"
          : "border border-white/20 text-white hover:border-white/40",
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
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 py-1 pl-3 pr-1 text-sm font-bold text-primary">
      {children}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={etiquetaQuitar}
        className="grid size-8 place-items-center rounded-full hover:bg-primary/20"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </span>
  );
}
