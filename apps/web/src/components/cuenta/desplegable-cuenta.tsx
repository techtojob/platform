"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authCliente } from "@/lib/auth-cliente";
import { useDesplegable } from "@/lib/use-desplegable";
import { Avatar } from "./avatar";

const clasesOpcion = "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-bold hover:bg-hover";

/**
 * Menú de la cuenta en la cabecera (igual en el móvil y en el ordenador):
 * Mi perfil, Mis ofertas, Mi cuenta, Panel de staff (solo staff) y Cerrar sesión.
 */
export function DesplegableCuenta({ nombre, imagen, esStaff }: { nombre: string; imagen: string | null; esStaff: boolean }) {
  const t = useTranslations("cuenta");
  const router = useRouter();
  const { abierto, setAbierto, raiz, boton } = useDesplegable();
  const [saliendo, empezar] = useTransition();

  return (
    <div ref={raiz} className="relative ml-1">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-cuenta"
        aria-label={t("menu", { nombre })}
        onClick={() => setAbierto((a) => !a)}
        className="flex h-11 items-center gap-2 rounded-full bg-chip pl-1.5 pr-1.5 text-sm font-bold text-texto transition-colors hover:bg-acento hover:text-ink aria-expanded:bg-acento aria-expanded:text-ink sm:pr-3"
      >
        <Avatar nombre={nombre} imagen={imagen} />
        <span className="hidden max-w-32 truncate sm:inline">{nombre.split(" ")[0]}</span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="hidden sm:block">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id="menu-cuenta"
        inert={!abierto}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false);
        }}
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 w-60 rounded-2xl border border-borde bg-fondo p-2 shadow-tarjeta transition duration-200 motion-reduce:transition-none ${abierto ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
      >
        <p className="truncate px-3 pb-2 pt-1 text-xs font-bold text-suave">{nombre}</p>
        <nav aria-label={t("miCuenta")} className="flex flex-col">
          <Link href="/cuenta/perfil" className={clasesOpcion}>
            {t("miPerfil")}
          </Link>
          <Link href="/cuenta/ofertas" className={clasesOpcion}>
            {t("misOfertas")}
          </Link>
          <Link href="/cuenta/ajustes" className={clasesOpcion}>
            {t("miCuenta")}
          </Link>
          {esStaff && (
            <Link href="/staff" className={`${clasesOpcion} text-enlace`}>
              {t("panelStaff")}
            </Link>
          )}
        </nav>
        <div className="mt-1 border-t border-borde pt-1">
          <button
            type="button"
            disabled={saliendo}
            onClick={() =>
              empezar(async () => {
                await authCliente.signOut();
                setAbierto(false);
                router.replace("/");
                router.refresh();
              })
            }
            className={`${clasesOpcion} text-suave disabled:opacity-50`}
          >
            {t("cerrarSesion")}
          </button>
        </div>
      </div>
    </div>
  );
}
