ALTER TABLE "usuarios" ALTER COLUMN "senha_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "clerk_id" varchar(255);--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_clerk_id_unique" UNIQUE("clerk_id");