import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

const clasesControl =
  "w-full rounded-control border border-borde-fuerte bg-superficie px-4 text-base text-texto placeholder:text-suave aria-invalid:border-peligro";

type PropsCampo = ComponentProps<"input"> & {
  etiqueta: string;
  ayuda?: string;
  error?: string;
};

/**
 * Campo de texto con su etiqueta, ayuda y error ya conectados para accesibilidad
 * (el lector de pantalla lee la ayuda y el error al entrar en el campo).
 */
export function Campo({ etiqueta, ayuda, error, id, className, ...props }: PropsCampo) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={idCampo} className="text-sm font-semibold">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(idAyuda, idError) || undefined}
        className={cn(clasesControl, "min-h-12")}
        {...props}
      />
      {ayuda && (
        <p id={idAyuda} className="text-sm text-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}
