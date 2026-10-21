import { Blobatar } from "@blobatar/react";
import { cn } from "@/lib/cn";

/**
 * Avatar "blob" de la comunidad, el mismo de la landing (paquete blobatar):
 * siempre el mismo dibujo para el mismo nombre. Sirve para empresas sin logo.
 */
export function AvatarBlob({ nombre, tamano = 44, className }: { nombre: string; tamano?: number; className?: string }) {
  return <Blobatar name={nombre} size={tamano} animate="hover" aria-hidden="true" className={cn("shrink-0", className)} />;
}
