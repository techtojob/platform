"use client";

import { buscarTecnologia } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Caja } from "@/components/buscador";
import { useRouter } from "@/i18n/navigation";
import { aParametrosTalento, cambiarTalento, leerFiltrosTalento } from "@/lib/filtros-talento";

const ESPERA_MS = 400;

/**
 * Buscador de talento: busca en nombre, titular y "sobre mí" mientras se escribe.
 * Si es una tecnología ("react") y se pulsa Enter, la convierte en filtro.
 */
export function BuscadorTalento() {
  const t = useTranslations("talento");
  return (
    <Suspense fallback={<Caja texto="" ejemplo={t("buscadorEjemplo")} />}>
      <ConDireccion />
    </Suspense>
  );
}

function ConDireccion() {
  const t = useTranslations("talento");
  const router = useRouter();
  const filtros = leerFiltrosTalento(Object.fromEntries(useSearchParams()));
  const [texto, setTexto] = useState(filtros.q ?? "");
  const [pendiente, startTransition] = useTransition();
  const caja = useRef<HTMLInputElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);

  const qDireccion = filtros.q ?? "";
  useEffect(() => {
    if (document.activeElement !== caja.current) setTexto(qDireccion);
  }, [qDireccion]);
  useEffect(() => () => clearTimeout(espera.current), []);

  function ir(q: string, tecnologia?: string) {
    let nuevos = cambiarTalento(filtros, { q: q || undefined });
    if (tecnologia && !nuevos.tecnologias.includes(tecnologia)) nuevos = { ...nuevos, tecnologias: [...nuevos.tecnologias, tecnologia] };
    startTransition(() => router.replace({ pathname: "/talento", query: aParametrosTalento(nuevos) }, { scroll: false }));
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    clearTimeout(espera.current);
    const limpio = texto.trim();
    const tecnologia = limpio ? buscarTecnologia(limpio) : undefined;
    if (tecnologia) {
      setTexto("");
      ir("", tecnologia.id);
    } else ir(limpio);
  }

  return (
    <Caja
      texto={texto}
      ejemplo={t("buscadorEjemplo")}
      refCaja={caja}
      pendiente={pendiente}
      onEnviar={alEnviar}
      onEscribir={(valor) => {
        setTexto(valor);
        clearTimeout(espera.current);
        espera.current = setTimeout(() => ir(valor.trim()), ESPERA_MS);
      }}
    />
  );
}
