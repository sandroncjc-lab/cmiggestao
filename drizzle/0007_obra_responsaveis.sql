-- Migração incremental: tabela de junção obra ↔ responsável
-- Reversível: DROP TABLE obra_responsaveis; DROP TYPE papel_responsavel;
-- (obras.aprovador_cliente_id e responsavel_interno_id são MANTIDOS — sem perda de dados)

-- 1. Enum de papel
CREATE TYPE papel_responsavel AS ENUM ('encarregado', 'aprovador');

-- 2. Tabela de junção
CREATE TABLE IF NOT EXISTS obra_responsaveis (
  id          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     uuid              NOT NULL REFERENCES obras(id)    ON DELETE CASCADE,
  usuario_id  uuid              NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  papel       papel_responsavel NOT NULL,
  criado_em   timestamp         NOT NULL DEFAULT now(),
  UNIQUE (obra_id, usuario_id, papel)
);

CREATE INDEX IF NOT EXISTS idx_obra_resp_obra    ON obra_responsaveis(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_resp_usuario ON obra_responsaveis(usuario_id);

-- 3. Migra aprovador_cliente_id existente → papel 'aprovador'
INSERT INTO obra_responsaveis (obra_id, usuario_id, papel)
SELECT id, aprovador_cliente_id, 'aprovador'
FROM obras
WHERE aprovador_cliente_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Migra responsavel_interno_id existente → papel 'encarregado'
INSERT INTO obra_responsaveis (obra_id, usuario_id, papel)
SELECT id, responsavel_interno_id, 'encarregado'
FROM obras
WHERE responsavel_interno_id IS NOT NULL
ON CONFLICT DO NOTHING;
