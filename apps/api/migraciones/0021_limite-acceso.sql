CREATE TABLE "limites_acceso" (
	"id" text PRIMARY KEY NOT NULL,
	"clave" text NOT NULL,
	"cuenta" integer NOT NULL,
	"ultima_peticion" bigint NOT NULL,
	CONSTRAINT "limites_acceso_clave_unique" UNIQUE("clave")
);
