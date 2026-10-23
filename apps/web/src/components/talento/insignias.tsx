import type { Disponibilidad, Emblema } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { IconoJuicio } from "@/components/proyectos/tarjeta-portfolio";
import { cn } from "@/lib/cn";

/** "Verificado": tiene su Discord vinculado y está en el servidor de TechToJob. */
export function Verificado({ conTexto = false, className }: { conTexto?: boolean; className?: string }) {
  const t = useTranslations("talento");
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-bold text-enlace", className)} title={t("verificadoAyuda")}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.8 14.6 4l3.4-.2.9 3.3 2.9 1.8-1.1 3.2 1.1 3.2-2.9 1.8-.9 3.3-3.4-.2L12 22.2 9.4 20l-3.4.2-.9-3.3-2.9-1.8 1.1-3.2-1.1-3.2 2.9-1.8.9-3.3 3.4.2Z" />
        <path d="m8 12.3 2.6 2.6L16.2 9.3" fill="none" stroke="var(--color-fondo)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {conTexto ? t("verificado") : <span className="sr-only">{t("verificado")}</span>}
    </span>
  );
}

const TONOS: Record<Disponibilidad, string> = {
  buscando: "bg-disponible text-ink",
  abierto: "bg-abierto text-ink",
  freelance: "border border-acento text-enlace",
  "no-busca": "bg-chip text-suave",
};

/** Si busca trabajo, está abierto, hace freelance o no busca ahora. */
export function EtiquetaDisponibilidad({ disponibilidad, className }: { disponibilidad: Disponibilidad; className?: string }) {
  const t = useTranslations("disponibilidad");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold leading-none", TONOS[disponibilidad], className)}>
      {disponibilidad === "buscando" && <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" />}
      {t(disponibilidad)}
    </span>
  );
}

/** Dibujo de cada tipo de emblema (sin emojis: SVG con el color del texto). */
function IconoEmblema({ tipo }: { tipo: Emblema["tipo"] }) {
  if (tipo === "torneo") {
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      </svg>
    );
  }
  if (tipo === "juicio") return <IconoJuicio />;
  if (tipo === "quiz") {
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9Z" />
    </svg>
  );
}

/** Nombre de un emblema: "Miembro fundador", "Torneo #2 · Landing"… */
export function useNombreEmblema() {
  const t = useTranslations("talento.emblemas");
  return (e: Emblema) => e.nombre ?? t(e.tipo);
}

/** Emblemas en pequeño (tarjeta) o con nombre y fecha (perfil). */
export function Emblemas({ emblemas, detalle = false }: { emblemas: Emblema[]; detalle?: boolean }) {
  const nombre = useNombreEmblema();
  const format = useFormatter();
  const t = useTranslations("talento");
  if (!emblemas.length) return null;
  if (!detalle) {
    return (
      <ul aria-label={t("emblemasTitulo")} className="flex flex-wrap gap-1.5">
        {emblemas.map((e, i) => (
          <li key={i} title={nombre(e)} className="flex size-8 items-center justify-center rounded-full bg-postit text-ink">
            <IconoEmblema tipo={e.tipo} />
            <span className="sr-only">{nombre(e)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {emblemas.map((e, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl bg-postit/95 px-4 py-3 text-ink">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white">
            <IconoEmblema tipo={e.tipo} />
          </span>
          <span className="flex flex-col">
            <span className="font-bold">{nombre(e)}</span>
            <span className="text-xs text-ink/80">{format.dateTime(new Date(e.fecha), { month: "long", year: "numeric" })}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
