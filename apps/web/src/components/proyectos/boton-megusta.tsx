"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { darMegusta } from "@/app/[locale]/proyectos/acciones";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Props = {
  id: string;
  megusta: number;
  meGusta: boolean;
  conSesion: boolean;
  /** Es de quien mira: se ve el número, pero no se puede dar. */
  esMio: boolean;
  /** Grande y con texto ("Me gusta · 3"), para la ficha del proyecto, sobre el panel de color acento. */
  grande?: boolean;
  className?: string;
};

/**
 * El corazón de un proyecto: se marca al momento (sin esperar al servidor) y, si algo falla,
 * vuelve a como estaba. Sin sesión lleva a "Entrar".
 */
export function BotonMegusta({ id, megusta: inicialMegusta, meGusta: inicialMeGusta, conSesion, esMio, grande = false, className }: Props) {
  const t = useTranslations("proyectos.megusta");
  const [real, ponerReal] = useState({ megusta: inicialMegusta, meGusta: inicialMeGusta });
  const [estado, ponerOptimista] = useOptimistic(real);
  const [, empezar] = useTransition();
  const [error, ponerError] = useState(false);

  const clases = cn(
    "relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full border font-bold tabular-nums transition-colors",
    grande
      ? cn("min-h-12 w-full justify-center px-5 text-base", estado.meGusta ? "border-ink bg-ink text-white" : "border-ink/30 bg-white/50 text-ink hover:bg-white/75")
      : cn("min-h-10 px-3.5 text-sm", estado.meGusta ? "border-peligro/40 bg-peligro/15 text-peligro" : "border-borde-fuerte bg-tarjeta text-texto hover:border-peligro/60 hover:text-peligro"),
    className,
  );
  const corazon = (
    <svg
      aria-hidden="true"
      width={grande ? 20 : 16}
      height={grande ? 20 : 16}
      viewBox="0 0 24 24"
      fill={estado.meGusta ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      className={grande && estado.meGusta ? "text-peligro" : undefined}
    >
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.6 4.5 7.2 4.5c2 0 3.5 1.1 4.8 2.8 1.3-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.6 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
    </svg>
  );
  // En grande: "Me gusta · 3"; en la tarjeta, solo el número.
  const numero = grande ? t("conTexto", { count: estado.megusta }) : estado.megusta;

  if (esMio) {
    return (
      <span className={cn(clases, "hover:border-borde-fuerte hover:text-texto")} title={t("tuyo")}>
        {corazon}
        {grande ? t("cuantos", { count: estado.megusta }) : estado.megusta}
        {!grande && <span className="sr-only">{t("cuantos", { count: estado.megusta })}</span>}
      </span>
    );
  }

  if (!conSesion) {
    return (
      <Link href="/entrar" className={clases} aria-label={t("entra", { count: estado.megusta })}>
        {corazon}
        {numero}
      </Link>
    );
  }

  function pulsar() {
    const dar = !estado.meGusta;
    ponerError(false);
    empezar(async () => {
      ponerOptimista({ megusta: estado.megusta + (dar ? 1 : -1), meGusta: dar });
      const r = await darMegusta(id, dar);
      if ("error" in r) ponerError(true);
      else ponerReal(r);
    });
  }

  return (
    <>
      <button type="button" onClick={pulsar} aria-pressed={estado.meGusta} aria-label={t(estado.meGusta ? "quitar" : "dar", { count: estado.megusta })} className={clases}>
        {corazon}
        {numero}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          {t("error")}
        </span>
      )}
    </>
  );
}
