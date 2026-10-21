import { cn } from "@/lib/cn";

/** Foto de la cuenta (la de Google o GitHub) o, si no hay, la inicial. */
export function Avatar({ nombre, imagen, grande = false }: { nombre: string; imagen: string | null; grande?: boolean }) {
  const tamano = grande ? "size-16 text-2xl" : "size-8 text-sm";
  if (imagen) {
    // Fotos de Google y GitHub: se enseñan tal cual, sin pasar por el optimizador de imágenes.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imagen} alt="" referrerPolicy="no-referrer" className={cn("shrink-0 rounded-full object-cover", tamano)} />;
  }
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-acento font-bold text-sobre-acento", tamano)}>
      {nombre.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
