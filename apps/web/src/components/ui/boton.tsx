import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type VarianteBoton = "primario" | "secundario" | "fantasma" | "peligro" | "sobrePostit";
export type TamanoBoton = "md" | "lg";

const variantes: Record<VarianteBoton, string> = {
  primario: "bg-acento text-sobre-acento hover:brightness-105",
  secundario: "border border-borde-fuerte bg-superficie text-texto hover:bg-hover",
  fantasma: "text-enlace hover:bg-hover",
  peligro: "bg-peligro text-fondo hover:brightness-105",
  /** Dentro de un Aviso (post-it): borde y texto oscuros en los dos modos. */
  sobrePostit: "border border-ink text-ink hover:bg-ink/10",
};

const tamanos: Record<TamanoBoton, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-13 px-6 text-base",
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
    "inline-flex items-center justify-center gap-2 rounded-control text-center font-semibold transition",
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
