"use client";

import { detectarAts, enlaceAts, type EmpresaStaff } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { anadirEmpresa, configurarEmpresa, sugerirEmpresas } from "@/app/[locale]/staff/empresas/acciones";
import { AreaTexto } from "@/components/formulario/piezas";
import { Boton, Campo, Casilla, Tarjeta } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

type Errores = "nombre" | "ats" | "empresa" | "desconocido";
const errorConocido = (codigo: string): Errores =>
  codigo === "nombre" || codigo === "ats" || codigo === "empresa" ? codigo : "desconocido";

/** Añadir una empresa pegando el enlace de su página de empleo. */
export function NuevaEmpresa() {
  const t = useTranslations("staff.empresas");
  const router = useRouter();
  const [nombre, ponerNombre] = useState("");
  const [pagina, ponerPagina] = useState("");
  const [error, ponerError] = useState<Errores | null>(null);
  const [ocupado, empezar] = useTransition();
  // Se comprueba al momento si el enlace es de Greenhouse, Lever o Ashby.
  const malEnlace = pagina.trim().length > 8 && !detectarAts(pagina);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) return ponerError("nombre");
    if (!detectarAts(pagina)) return ponerError("ats");
    empezar(async () => {
      const codigo = await anadirEmpresa(nombre, pagina);
      if (codigo) return ponerError(errorConocido(codigo));
      ponerNombre("");
      ponerPagina("");
      ponerError(null);
      router.refresh();
    });
  };

  return (
    <Tarjeta className="p-5 sm:p-6">
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <h2 className="text-xl font-bold tracking-tight">{t("anadir")}</h2>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Campo
            etiqueta={t("nombre")}
            value={nombre}
            onChange={(e) => ponerNombre(e.target.value)}
            maxLength={80}
            autoComplete="off"
            error={error === "nombre" ? t("errores.nombre") : undefined}
          />
          <Campo
            etiqueta={t("pagina")}
            ayuda={t("paginaAyuda")}
            value={pagina}
            onChange={(e) => ponerPagina(e.target.value)}
            inputMode="url"
            autoComplete="off"
            placeholder="https://jobs.ashbyhq.com/…"
            error={error === "ats" || malEnlace ? t("errores.ats") : undefined}
          />
        </div>
        {error && error !== "nombre" && error !== "ats" && (
          <p role="alert" className="text-sm font-semibold text-peligro">
            {t(`errores.${error}`)}
          </p>
        )}
        <Boton type="submit" disabled={ocupado} className="self-start">
          {ocupado ? t("guardando") : t("guardar")}
        </Boton>
      </form>
    </Tarjeta>
  );
}

/** Página de empleo, leer cada día y "no publicar" de una empresa. */
export function AjustesEmpresa({ empresa }: { empresa: EmpresaStaff }) {
  const t = useTranslations("staff.empresas");
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, ponerError] = useState<Errores | null>(null);
  const [editando, editar] = useState(false);
  const [pagina, ponerPagina] = useState(
    empresa.ats && empresa.atsId ? enlaceAts(empresa.ats, empresa.atsId, empresa.atsRegion) : "",
  );

  // Las casillas cambian al momento; si el servidor dice que no, vuelven a como estaban.
  const [estado, cambiarEstado] = useOptimistic(
    { sincronizar: empresa.sincronizar, bloqueada: empresa.bloqueada },
    (actual, cambios: { sincronizar?: boolean; bloqueada?: boolean }) => ({ ...actual, ...cambios }),
  );

  const guardar = (cambios: Parameters<typeof configurarEmpresa>[1], despues?: () => void) =>
    empezar(async () => {
      cambiarEstado({
        ...(cambios.sincronizar !== undefined && { sincronizar: cambios.sincronizar }),
        ...(cambios.bloqueada !== undefined && { bloqueada: cambios.bloqueada, ...(cambios.bloqueada && { sincronizar: false }) }),
      });
      const codigo = await configurarEmpresa(empresa.id, cambios);
      if (codigo) return ponerError(errorConocido(codigo));
      ponerError(null);
      despues?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3 border-t border-borde pt-4">
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        {empresa.ats && (
          <Casilla
            etiqueta={t("sincronizar")}
            checked={estado.sincronizar}
            disabled={estado.bloqueada}
            onChange={(e) => guardar({ sincronizar: e.target.checked })}
          />
        )}
        <Casilla
          etiqueta={t("bloqueada")}
          checked={estado.bloqueada}
          onChange={(e) => guardar({ bloqueada: e.target.checked, ...(!e.target.checked && empresa.ats && { sincronizar: true }) })}
        />
      </div>
      {estado.bloqueada && <p className="text-sm text-suave">{t("bloqueadaAyuda")}</p>}

      {editando ? (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (pagina.trim() && !detectarAts(pagina)) return ponerError("ats");
            guardar({ paginaEmpleo: pagina.trim() }, () => editar(false));
          }}
        >
          <Campo
            etiqueta={t("pagina")}
            ayuda={t("paginaAyuda")}
            value={pagina}
            onChange={(e) => ponerPagina(e.target.value)}
            inputMode="url"
            autoComplete="off"
            error={error === "ats" ? t("errores.ats") : undefined}
          />
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" disabled={ocupado}>
              {ocupado ? t("guardando") : t("guardar")}
            </Boton>
            <Boton type="button" variante="fantasma" onClick={() => editar(false)}>
              {t("cancelar")}
            </Boton>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Boton type="button" variante="secundario" onClick={() => editar(true)} disabled={ocupado}>
            {empresa.ats ? t("cambiarPagina") : t("ponerPagina")}
          </Boton>
          {empresa.ats && (
            <Boton type="button" variante="fantasma" disabled={ocupado} onClick={() => guardar({ paginaEmpleo: "" }, () => ponerPagina(""))}>
              {t("quitarPagina")}
            </Boton>
          )}
        </div>
      )}
      {error && error !== "ats" && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t(`errores.${error}`)}
        </p>
      )}
    </div>
  );
}

/** Sugerir nombres de empresas para que el sistema pruebe si tienen página de empleo. */
export function SugerirEmpresas() {
  const t = useTranslations("staff.empresas");
  const router = useRouter();
  const [texto, ponerTexto] = useState("");
  const [aviso, ponerAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, empezar] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        empezar(async () => {
          const r = await sugerirEmpresas(texto);
          if ("error" in r) return ponerAviso({ ok: false, texto: t("errores.desconocido") });
          ponerTexto("");
          ponerAviso({ ok: true, texto: t("descubrir.anadidas", { count: r.anadidas }) });
          router.refresh();
        });
      }}
    >
      <AreaTexto
        etiqueta={t("descubrir.sugerir")}
        ayuda={t("descubrir.sugerirAyuda")}
        rows={3}
        maxLength={8000}
        value={texto}
        onChange={(e) => ponerTexto(e.target.value)}
        placeholder={"Supabase\nPostHog"}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" variante="secundario" disabled={ocupado || !texto.trim()}>
          {ocupado ? t("guardando") : t("descubrir.enviar")}
        </Boton>
        {aviso && (
          <p role="status" className={aviso.ok ? "text-sm font-bold" : "text-sm font-semibold text-peligro"}>
            {aviso.texto}
          </p>
        )}
      </div>
    </form>
  );
}
