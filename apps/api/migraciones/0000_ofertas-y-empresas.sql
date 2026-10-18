CREATE TABLE "empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"web" text,
	"logo_url" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "oferta_idiomas" (
	"oferta_id" text NOT NULL,
	"idioma" text NOT NULL,
	"nivel" text,
	CONSTRAINT "oferta_idiomas_oferta_id_idioma_pk" PRIMARY KEY("oferta_id","idioma")
);
--> statement-breakpoint
CREATE TABLE "ofertas" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"empresa_id" text NOT NULL,
	"titulo" text NOT NULL,
	"resumen" text,
	"idioma" text NOT NULL,
	"url_original" text NOT NULL,
	"area" text NOT NULL,
	"seniority" text NOT NULL,
	"modalidad" text NOT NULL,
	"tecnologias" text[] DEFAULT '{}'::text[] NOT NULL,
	"pais" text,
	"ciudad" text,
	"remoto_desde" text,
	"salario_min" integer,
	"salario_max" integer,
	"moneda" text,
	"origen" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"motivo_rechazo" text,
	"revisada_por" text,
	"revisada_en" timestamp with time zone,
	"publicada_en" timestamp with time zone,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oferta_idiomas" ADD CONSTRAINT "oferta_idiomas_oferta_id_ofertas_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."ofertas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ofertas_estado_publicada_idx" ON "ofertas" USING btree ("estado","publicada_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ofertas_tecnologias_idx" ON "ofertas" USING gin ("tecnologias");