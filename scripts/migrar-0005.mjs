import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
await sql`ALTER TABLE rdo ADD COLUMN IF NOT EXISTS link_token varchar(64)`
await sql`ALTER TABLE rdo ADD COLUMN IF NOT EXISTS token_expires_at timestamp`
await sql`CREATE UNIQUE INDEX IF NOT EXISTS rdo_link_token_idx ON rdo (link_token)`
console.log('✅ Migração 0005 aplicada: link_token + token_expires_at adicionados ao rdo')
