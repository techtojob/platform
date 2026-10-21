import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { obtenerCuenta } from "@/lib/api";
import { DesplegableCuenta } from "./desplegable-cuenta";
import { ExigirUbicacion } from "./exigir-ubicacion";

/** Cabecera: "Entrar" o, con sesión, el menú de la cuenta (Mi perfil, Mi cuenta, Panel de staff, Cerrar sesión). */
export async function MenuCuenta() {
  const [t, cabeceras] = await Promise.all([
    getTranslations("cuenta"),
    headers(),
  ]);
  const cuenta = await obtenerCuenta(cabeceras.get("cookie")).catch(() => null);

  if (!cuenta) {
    return (
      <Link
        href="/entrar"
        className={clasesBoton({ className: "ml-1 px-4 min-[50rem]:px-5" })}
      >
        {t("entrar")}
      </Link>
    );
  }
  return (
    <>
      {/* Sin país todavía: a completar la cuenta. */}
      {!cuenta.ubicacion && <ExigirUbicacion />}
      <DesplegableCuenta
        nombre={cuenta.usuario.nombre}
        imagen={cuenta.usuario.imagen}
        esStaff={cuenta.esStaff}
        recruiter={cuenta.recruiter?.estado ?? null}
      />
    </>
  );
}

/** Lo que se ve mientras se mira si hay sesión: un hueco del mismo tamaño, para que nada salte. */
export function MenuCuentaCargando() {
  return (
    <span
      aria-hidden="true"
      className="ml-1 block h-11 w-11 rounded-full bg-chip sm:w-24"
    />
  );
}
