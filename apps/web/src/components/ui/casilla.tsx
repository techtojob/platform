import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Casilla de filtro con su texto y, si se da, cuántas ofertas hay: "☐ Desarrollo  12". */
export function Casilla({
  etiqueta,
  cuenta,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { etiqueta: string; cuenta?: number }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold lg:min-h-10", className)}>
      <input type="checkbox" className="size-[1.125rem] shrink-0 accent-acento" {...props} />
      <span className="flex-1">{etiqueta}</span>
      {cuenta !== undefined && <span className="min-w-7 rounded-full bg-chip px-2 py-0.5 text-center text-xs font-bold tabular-nums text-suave">{cuenta}</span>}
    </label>
  );
}
