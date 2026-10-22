"use client";

import { buscarTecnologia } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Caja } from "@/components/buscador";
import { useRouter } from "@/i18n/navigation";
import { aParametrosProyectos, cambiarProyectos, leerFiltrosProyectos } from "@/lib/filtros-proyectos";

const ESPERA_MS = 400;

/**
 * Buscador de proyectos: busca en el título y la descripción mientras se escribe.
 * Si es una tecnología ("python") y se pulsa Enter, la convierte en filtro.
 */
export function BuscadorProyectos() {
  const t = useTranslations("proyectos");
  return (
    <Suspense fallback={<Caja texto="" ejemplo={t("buscadorEjemplo")} />}>
      <ConDireccion />
    </Suspense>
  );
}

function ConDireccion() {
  const t = useTranslations("proyectos");
  const router = useRouter();
  const filtros = leerFiltrosProyectos(Object.fromEntries(useSearchParams()));
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
    let nuevos = cambiarProyectos(filtros, { q: q || undefined });
    if (tecnologia && !nuevos.tecnologias.includes(tecnologia)) nuevos = { ...nuevos, tecnologias: [...nuevos.tecnologias, tecnologia] };
    startTransition(() => router.replace({ pathname: "/proyectos", query: aParametrosProyectos(nuevos) }, { scroll: false }));
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
