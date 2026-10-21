"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Inicio de sesión desde el navegador. Llama a /api/auth/* de la propia web,
 * que la web pasa al API (ver next.config.ts).
 */
export const authCliente = createAuthClient({ basePath: "/api/auth" });
