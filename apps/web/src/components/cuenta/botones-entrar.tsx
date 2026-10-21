"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Boton } from "@/components/ui";
import { authCliente } from "@/lib/auth-cliente";

type Proveedor = "google" | "github";

/** "Continuar con Google" y "Continuar con GitHub". Llevan a la página de cada uno y vuelven. */
export function BotonesEntrar({ volverA, siFalla }: { volverA: string; siFalla: string }) {
  const t = useTranslations("entrar");
  const [enCurso, setEnCurso] = useState<Proveedor | null>(null);

  async function entrar(provider: Proveedor) {
    setEnCurso(provider);
    const { error } = await authCliente.signIn.social({ provider, callbackURL: volverA, errorCallbackURL: siFalla });
    // Si va bien, el navegador ya se ha ido a Google o GitHub. Si no, se puede volver a intentar.
    if (error) setEnCurso(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {(["google", "github"] as const).map((p) => (
        <Boton key={p} variante="secundario" tamano="lg" className="w-full" disabled={!!enCurso} onClick={() => entrar(p)}>
          {enCurso === p ? t("abriendo") : t(p)}
        </Boton>
      ))}
    </div>
  );
}
