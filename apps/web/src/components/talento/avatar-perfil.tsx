import type { Disponibilidad } from "@techtojob/shared";
import { AvatarBlob } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Anillo de la foto según la disponibilidad: verde si busca trabajo (con un puntito, como
 * #OpenToWork), ámbar si está abierto a ofertas, turquesa si hace freelance y gris si no busca.
 * Con un hueco entre la foto y el anillo: así cualquier foto (de fondo claro u oscuro) queda igual.
 */
const ANILLO: Record<Disponibilidad, string> = {
  buscando: "border-disponible",
  abierto: "border-abierto",
  freelance: "border-acento",
  "no-busca": "border-borde-fuerte",
};

/** Foto del perfil (la que eligió: Google o GitHub) o su blob de la comunidad, con su anillo. */
export function AvatarPerfil({
  nombre,
  imagen,
  disponibilidad = "no-busca",
  tamano = 56,
  className,
}: {
  nombre: string;
  imagen: string | null;
  disponibilidad?: Disponibilidad;
  tamano?: number;
  className?: string;
}) {
  const dentro = tamano - 8; // 2 px de anillo + 2 px de hueco a cada lado
  const punto = Math.max(10, Math.round(tamano * 0.22));
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full border-2 p-[2px]", ANILLO[disponibilidad], className)}
      style={{ width: tamano, height: tamano }}
    >
      {imagen ? (
        // Fotos de Google y GitHub: tal cual, sin el optimizador de imágenes.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagen} alt="" referrerPolicy="no-referrer" width={dentro} height={dentro} className="rounded-full object-cover" style={{ width: dentro, height: dentro }} />
      ) : (
        <AvatarBlob nombre={nombre} tamano={dentro} />
      )}
      {disponibilidad === "buscando" && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 rounded-full border-2 border-fondo bg-disponible"
          style={{ width: punto, height: punto }}
        />
      )}
    </span>
  );
}
