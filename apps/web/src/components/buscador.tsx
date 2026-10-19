"use client";

import { buscarTecnologia } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition, type FormEvent, type Ref } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { aParametros, cambiar, leerFiltros } from "@/lib/filtros";

/** Espera desde la última letra antes de buscar mientras se escribe. */
const ESPERA_MS = 400;

/**
 * Buscador de la portada del listado. Busca en título, empresa y resumen; si lo que se escribe
 * es una tecnología ("react", "k8s") y se pulsa Enter, la convierte en filtro.
 *
 * Busca mientras se escribe. Lee y escribe la dirección (?q=…), que solo se conoce al
 * visitar la página: mientras tanto se ve la misma caja, quieta.
 */
export function Buscador() {
  return (
    <Suspense fallback={<Caja texto="" />}>
      <BuscadorConDireccion />
    </Suspense>
  );
}

function BuscadorConDireccion() {
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();
  const filtros = leerFiltros(Object.fromEntries(parametros));
  const enListado = pathname === "/";

  const [texto, setTexto] = useState(filtros.q ?? "");
  const [pendiente, startTransition] = useTransition();
  const caja = useRef<HTMLInputElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Si la dirección cambia por otro lado (quitar filtros, atrás…), la caja la sigue,
  // salvo mientras se está escribiendo en ella.
  const qDireccion = filtros.q ?? "";
  useEffect(() => {
    if (document.activeElement !== caja.current) setTexto(qDireccion);
  }, [qDireccion]);

  useEffect(() => () => clearTimeout(espera.current), []);

  function ir(q: string, tecnologia?: string) {
    let nuevos = cambiar(filtros, { q: q || undefined });
    if (tecnologia && !nuevos.tecnologias.includes(tecnologia)) {
      nuevos = { ...nuevos, tecnologias: [...nuevos.tecnologias, tecnologia] };
    }
    const destino = { pathname: "/" as const, query: aParametros(nuevos) };
    startTransition(() => (enListado ? router.replace(destino, { scroll: false }) : router.push(destino)));
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    clearTimeout(espera.current);
    if (enListado) espera.current = setTimeout(() => ir(valor.trim()), ESPERA_MS);
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    clearTimeout(espera.current);
    const limpio = texto.trim();
    const tecnologia = limpio ? buscarTecnologia(limpio) : undefined;
    if (tecnologia) {
      setTexto("");
      ir("", tecnologia.id);
    } else {
      ir(limpio);
    }
  }

  return <Caja texto={texto} onEscribir={alEscribir} onEnviar={alEnviar} pendiente={pendiente} refCaja={caja} />;
}

function Caja({
  texto,
  onEscribir,
  onEnviar,
  pendiente = false,
  refCaja,
}: {
  texto: string;
  onEscribir?: (valor: string) => void;
  onEnviar?: (e: FormEvent) => void;
  pendiente?: boolean;
  refCaja?: Ref<HTMLInputElement>;
}) {
  const t = useTranslations("buscador");
  return (
    <form role="search" onSubmit={onEnviar} className="relative flex w-full items-center">
      <label htmlFor="buscador" className="sr-only">
        {t("etiqueta")}
      </label>
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="pointer-events-none absolute left-5 text-suave"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={refCaja}
        id="buscador"
        type="search"
        name="q"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={100}
        value={texto}
        readOnly={!onEscribir}
        onChange={(e) => onEscribir?.(e.target.value)}
        placeholder={t("ejemplo")}
        aria-busy={pendiente}
        className="h-14 w-full rounded-full border border-borde-fuerte bg-tarjeta pl-13 pr-4 text-base text-texto shadow-tarjeta placeholder:text-suave sm:pr-32"
      />
      <button
        type="submit"
        className="absolute right-1.5 hidden h-11 items-center rounded-full bg-acento px-6 text-sm font-bold text-ink transition hover:brightness-105 sm:inline-flex"
      >
        {t("buscar")}
      </button>
    </form>
  );
}
