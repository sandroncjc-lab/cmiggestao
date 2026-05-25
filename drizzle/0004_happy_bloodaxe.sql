CREATE TYPE "public"."tipo_contrato" AS ENUM('homem_hora', 'valor_fechado');--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "tipo" "tipo_contrato" DEFAULT 'valor_fechado' NOT NULL;