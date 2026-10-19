CREATE TABLE "emblemas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" text NOT NULL,
	"nombre" text,
	"otorgado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"caduca_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "perfiles" (
	"usuario_id" text PRIMARY KEY NOT NULL,
	"alias" text NOT NULL,
	"nombre" text NOT NULL,
	"titular" text NOT NULL,
	"sobre_mi" text,
	"area" text NOT NULL,
	"seniority" text NOT NULL,
	"ciudad" text,
	"pais" text,
	"modalidades" text[] DEFAULT '{}'::text[] NOT NULL,
	"disponibilidad" text NOT NULL,
	"tecnologias" text[] DEFAULT '{}'::text[] NOT NULL,
	"idiomas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"linkedin" text,
	"github" text,
	"portfolio" text,
	"mostrar_foto" boolean DEFAULT false NOT NULL,
	"visibilidad" text DEFAULT 'registrados' NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perfiles_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "reportes_perfil" (
	"id" text PRIMARY KEY NOT NULL,
	"perfil_usuario_id" text NOT NULL,
	"reportado_por" text NOT NULL,
	"motivo" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emblemas" ADD CONSTRAINT "emblemas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes_perfil" ADD CONSTRAINT "reportes_perfil_perfil_usuario_id_perfiles_usuario_id_fk" FOREIGN KEY ("perfil_usuario_id") REFERENCES "public"."perfiles"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes_perfil" ADD CONSTRAINT "reportes_perfil_reportado_por_usuarios_id_fk" FOREIGN KEY ("reportado_por") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emblemas_usuario_idx" ON "emblemas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "perfiles_visibles_idx" ON "perfiles" USING btree ("visibilidad","actualizada_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "perfiles_tecnologias_idx" ON "perfiles" USING gin ("tecnologias");--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_perfil_unico_idx" ON "reportes_perfil" USING btree ("perfil_usuario_id","reportado_por");