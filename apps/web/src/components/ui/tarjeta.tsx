import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Caja base para ofertas, perfiles, formularios… */
export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta", className)}
      {...props}
    />
  );
}
