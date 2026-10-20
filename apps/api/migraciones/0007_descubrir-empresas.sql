CREATE TABLE "candidatas" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"identificadores" text[] NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"probada_en" timestamp with time zone,
	"empresa_id" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "errores_seguidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "ultima_oferta_util" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "origen" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidatas" ADD CONSTRAINT "candidatas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;