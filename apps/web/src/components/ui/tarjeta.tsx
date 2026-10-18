import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Caja base para ofertas, perfiles, formularios… */
export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-tarjeta border border-white/10 bg-ink p-6", className)}
      {...props}
    />
  );
}
