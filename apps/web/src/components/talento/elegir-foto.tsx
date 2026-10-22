"use client";

import type { Disponibilidad, FotoPerfil, FotosCuenta } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { AvatarPerfil } from "./avatar-perfil";

/** Elegir la foto del perfil: la de Google, la de GitHub (si tiene esas cuentas) o ninguna. */
export function ElegirFoto({
  valor,
  fotos,
  nombre,
  disponibilidad,
  onCambio,
}: {
  valor: FotoPerfil;
  fotos: FotosCuenta;
  nombre: string;
  disponibilidad: Disponibilidad;
  onCambio: (foto: FotoPerfil) => void;
}) {
  const t = useTranslations("miPerfil.foto");
  const opciones: Array<{ valor: FotoPerfil; imagen: string | null }> = [
    ...(fotos.google ? [{ valor: "google" as const, imagen: fotos.google }] : []),
    ...(fotos.github ? [{ valor: "github" as const, imagen: fotos.github }] : []),
    { valor: "ninguna", imagen: null },
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">{t("titulo")}</legend>
      <div className="flex flex-wrap gap-3">
        {opciones.map((o) => (
          <label
            key={o.valor}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 transition-colors",
              valor === o.valor ? "border-acento bg-acento/10" : "border-borde hover:border-borde-fuerte",
            )}
          >
            <input type="radio" name="foto" value={o.valor} checked={valor === o.valor} onChange={() => onCambio(o.valor)} className="sr-only" />
            <AvatarPerfil nombre={nombre || "?"} imagen={o.imagen} disponibilidad={disponibilidad} tamano={44} />
            <span className="text-sm font-bold">{t(o.valor)}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-suave">{t("ayuda")}</p>
    </fieldset>
  );
}
