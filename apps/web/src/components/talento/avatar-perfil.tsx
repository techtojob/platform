import { AvatarBlob } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Foto del perfil (si la persona quiere mostrarla) o su blob de la comunidad. */
export function AvatarPerfil({ nombre, imagen, tamano = 56, className }: { nombre: string; imagen: string | null; tamano?: number; className?: string }) {
  if (imagen) {
    // Fotos de Google y GitHub: tal cual, sin el optimizador de imágenes.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imagen} alt="" referrerPolicy="no-referrer" width={tamano} height={tamano} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: tamano, height: tamano }} />;
  }
  return <AvatarBlob nombre={nombre} tamano={tamano} className={className} />;
}
