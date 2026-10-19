import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Panel "tipo Discord", como las preguntas frecuentes de la landing:
 * arriba el nombre del canal (#filtros) y, opcional, algo a la derecha.
 */
export function Ventana({
  canal,
  extra,
  className,
  children,
  ...props
}: { canal: string; extra?: ReactNode; className?: string; children: ReactNode } & Omit<
  React.ComponentProps<"section">,
  "children"
>) {
  return (
    <section className={cn("rounded-tarjeta bg-ventana p-3 shadow-tarjeta sm:p-4", className)} {...props}>
      <div className="flex min-h-9 items-center justify-between gap-3 px-2 pb-2">
        <p className="text-xs font-bold text-enlace">#{canal}</p>
        {extra}
      </div>
      {children}
    </section>
  );
}
