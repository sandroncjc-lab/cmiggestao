-- Migração incremental: campos de assinatura externa (in loco sem conta) no RDO
-- Reversível: ALTER TABLE rdo DROP COLUMN nome_assinante_externo, DROP COLUMN cargo_assinante_externo;

ALTER TABLE rdo ADD COLUMN IF NOT EXISTS nome_assinante_externo varchar(255);
ALTER TABLE rdo ADD COLUMN IF NOT EXISTS cargo_assinante_externo varchar(100);
