import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type VarianteBoton = "primario" | "secundario" | "fantasma" | "peligro";
export type TamanoBoton = "md" | "lg";

const variantes: Record<VarianteBoton, string> = {
  primario: "bg-primary text-ink hover:brightness-110",
  secundario: "border border-white/25 text-white hover:border-white/50 hover:bg-white/5",
  fantasma: "text-primary hover:bg-white/5",
  peligro: "bg-peligro text-ink hover:brightness-105",
};

const tamanos: Record<TamanoBoton, string> = {
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-14 px-7 text-base",
};

/**
 * Clases de un botón. Sirven también para enlaces con aspecto de botón:
 * <Link href="/talento" className={clasesBoton({ variante: "secundario" })}>
 */
export function clasesBoton({
  variante = "primario",
  tamano = "md",
  className,
}: { variante?: VarianteBoton; tamano?: TamanoBoton; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-bold transition",
    "disabled:pointer-events-none disabled:opacity-50",
    variantes[variante],
    tamanos[tamano],
    className,
  );
}

type PropsBoton = ComponentProps<"button"> & { variante?: VarianteBoton; tamano?: TamanoBoton };

export function Boton({ variante, tamano, className, type = "button", ...props }: PropsBoton) {
  return <button type={type} className={clasesBoton({ variante, tamano, className })} {...props} />;
}
