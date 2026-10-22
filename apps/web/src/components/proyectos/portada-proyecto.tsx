"use client";

import type { Area } from "@techtojob/shared";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Color de fondo de la portada sin imagen, según el área (siempre el mismo para la misma). */
const TONOS: Record<string, string> = {
  desarrollo: "from-acento/40 to-acento/5",
  datos: "from-abierto/40 to-abierto/5",
  ia: "from-enlace/40 to-enlace/5",
  ciberseguridad: "from-peligro/35 to-peligro/5",
  "producto-diseno": "from-postit/40 to-postit/5",
  "infra-devops": "from-disponible/40 to-disponible/5",
  "soporte-it": "from-borde-fuerte/60 to-chip",
};

/**
 * La imagen de arriba del proyecto: la que hace GitHub del repositorio (título, descripción,
 * estrellas). Si no es de GitHub (o no carga: repositorio privado o borrado), un fondo con la inicial.
 */
export function PortadaProyecto({ portada, titulo, area, className }: { portada: string | null; titulo: string; area: Area; className?: string }) {
  const [fallo, ponerFallo] = useState<string | null>(null);
  const conImagen = portada && fallo !== portada;
  return (
    <div className={cn("relative aspect-[2/1] w-full overflow-hidden bg-chip", className)}>
      {conImagen ? (
        // Imagen de GitHub, tal cual (sin el optimizador de imágenes).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={portada} alt="" loading="lazy" referrerPolicy="no-referrer" width={1200} height={600} onError={() => ponerFallo(portada)}
          // Si falló antes de que la página cobrara vida, onError no llega: se mira al montarla.
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) ponerFallo(portada);
          }}
          className="size-full object-cover" />
      ) : (
        <div aria-hidden="true" className={cn("flex size-full items-center justify-center bg-gradient-to-br", TONOS[area] ?? "from-chip to-fondo")}>
          <span className="text-6xl font-bold text-texto/70">{titulo.trim().charAt(0).toLocaleUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
