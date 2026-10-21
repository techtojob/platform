"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/** Páginas que se pueden ver sin haber completado la cuenta. */
const LIBRES = ["/cuenta/bienvenida", "/privacidad", "/entrar"];

/**
 * Con sesión pero sin país: a completar la cuenta (país y región). Va en la cabecera, que ya sabe
 * si hay sesión, así que funciona en todas las páginas sin pedir nada más al API.
 */
export function ExigirUbicacion() {
  const ruta = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!LIBRES.some((l) => ruta === l || ruta.startsWith(`${l}/`))) router.replace("/cuenta/bienvenida");
  }, [ruta, router]);
  return null;
}
