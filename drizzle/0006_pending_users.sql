-- Migração incremental: suporte a usuários pendentes de atribuição
-- Reversível: DROP VALUE não é suportado em Postgres, mas a coluna pode ser
--             restaurada com NOT NULL se necessário (ALTER COLUMN ... SET NOT NULL)

-- 1. Adiciona valor 'pendente' ao enum de funções
--    (ADD VALUE IF NOT EXISTS é idempotente e seguro)
ALTER TYPE funcao_usuario ADD VALUE IF NOT EXISTS 'pendente';

-- 2. Permite empresa_id nulo — usuários que se cadastram sozinhos
--    não têm empresa até serem atribuídos por um admin
ALTER TABLE "usuarios" ALTER COLUMN "empresa_id" DROP NOT NULL;
