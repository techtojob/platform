import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * El post-it de TechToJob: solo para avisos que importan de verdad
 * (como "Hay 3 ofertas más que piden inglés"). Igual en los dos modos.
 */
export function Aviso({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-tarjeta bg-postit p-4 text-ink sm:px-5", className)} {...props} />;
}
