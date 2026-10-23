import { defineConfig } from "vitest/config";

// Cada archivo de pruebas crea su base de datos en memoria (PGlite) y migra: en un ordenador
// lento algunas pruebas pasan de los 5 s por defecto y fallan sin estar mal.
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
