CREATE TABLE "recruiters" (
	"usuario_id" text PRIMARY KEY NOT NULL,
	"estado" text DEFAULT 'activo' NOT NULL,
	"cargo" text NOT NULL,
	"empresa_nombre" text NOT NULL,
	"empresa_web" text,
	"linkedin" text NOT NULL,
	"mensaje" text,
	"empresa_id" text,
	"agencia" boolean DEFAULT false NOT NULL,
	"motivo" text,
	"bloqueado_por" text,
	"bloqueado_en" timestamp with time zone,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_bloqueado_por_usuarios_id_fk" FOREIGN KEY ("bloqueado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recruiters_estado_idx" ON "recruiters" USING btree ("estado","creada_en");