import { defineConfig } from "vitest/config";

// Pruebas de la lógica de la web (src/lib). Los componentes se revisan a ojo en /empleo/componentes.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
