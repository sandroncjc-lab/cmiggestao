-- Migração incremental: adiciona colunas de token para aprovação remota do RDO
-- Reversível: DROP COLUMN link_token, token_expires_at

ALTER TABLE "rdo" ADD COLUMN IF NOT EXISTS "link_token" varchar(64);
ALTER TABLE "rdo" ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp;

-- Índice único para lookup rápido por token
CREATE UNIQUE INDEX IF NOT EXISTS "rdo_link_token_idx" ON "rdo" ("link_token");
