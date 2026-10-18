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
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 lg:min-h-9", className)}>
      <input type="checkbox" className="size-[1.125rem] shrink-0 accent-[#2a7371]" {...props} />
      <span className="flex-1">{etiqueta}</span>
      {cuenta !== undefined && <span className="text-sm tabular-nums text-suave">{cuenta}</span>}
    </label>
  );
}
