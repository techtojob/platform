import Image from "next/image";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * El post-it de TechToJob, con su chincheta, como en la landing: solo para lo que importa
 * de verdad (como "Hay 3 ofertas más que piden inglés"). Igual en los dos modos.
 */
export function Aviso({
  className,
  children,
  chincheta = true,
  giro = "-rotate-[0.8deg]",
  ...props
}: ComponentProps<"div"> & { chincheta?: boolean; giro?: string }) {
  return (
    <div className={cn("relative rounded-tarjeta bg-postit p-5 text-ink shadow-tarjeta sm:px-6", giro, className)} {...props}>
      {chincheta && (
        <Image
          src="/empleo-recursos/pin.svg"
          alt=""
          width={32}
          height={36}
          unoptimized
          className="pointer-events-none absolute -top-4 left-8 h-9 w-auto drop-shadow-md"
        />
      )}
      {children}
    </div>
  );
}
